"use server"

import { db } from "@/lib/db"
import { requireRole, getCurrentUser } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"

// ─── Public queries ───────────────────────────────────────────────────────────

export async function getKudosWall(page = 1, perPage = 20) {
  const [rows, total] = await Promise.all([
    db.kudos.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        amount: true,
        message: true,
        value: true,
        createdAt: true,
        from: { select: { id: true, name: true, email: true, avatarUrl: true } },
        to:   { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    }),
    db.kudos.count(),
  ])
  return { rows, total }
}

export async function getMyKudosBalance() {
  const user = await getCurrentUser()
  if (!user) return null

  const settings = await getSettings()
  const budget = settings.kudosMonthlyBudget

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [received, spent, redeemed] = await Promise.all([
    db.kudos.aggregate({ where: { toId: user.id }, _sum: { amount: true } }),
    db.kudos.aggregate({ where: { fromId: user.id, createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.kudosRedemption.aggregate({
      where: { userId: user.id, status: { in: ["PENDING", "DONE"] } },
      _sum: { amount: true },
    }),
  ])

  const totalReceived = received._sum.amount ?? 0
  const spentThisMonth = spent._sum.amount ?? 0
  const totalRedeemed = redeemed._sum.amount ?? 0
  const remaining = budget > 0 ? Math.max(0, budget - spentThisMonth) : null

  return {
    totalReceived,
    spentThisMonth,
    totalRedeemed,
    available: totalReceived - totalRedeemed,
    remaining,
    budget,
    redeemEnabled: settings.kudosRedeemEnabled,
    redeemRateLabel: settings.kudosRedeemRateLabel,
  }
}

export async function getTopKudosRecipients(limit = 5) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const grouped = await db.kudos.groupBy({
    by: ["toId"],
    where: { createdAt: { gte: monthStart } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  })

  if (grouped.length === 0) return []

  const users = await db.user.findMany({
    where: { id: { in: grouped.map((g) => g.toId) } },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))

  return grouped
    .map((g) => {
      const u = userMap.get(g.toId)
      if (!u) return null
      return { userId: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, total: g._sum.amount ?? 0 }
    })
    .filter(Boolean) as Array<{ userId: string; name: string | null; email: string; avatarUrl: string | null; total: number }>
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function sendKudos(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("Not authenticated.")

  const settings = await getSettings()
  if (!parseModules(settings.enabledModules).has("kudos")) return fail("Kudos module is disabled.")

  const toId   = String(formData.get("toId") ?? "").trim()
  const amount = Math.max(1, parseInt(String(formData.get("amount") ?? "1"), 10) || 1)
  const message = String(formData.get("message") ?? "").trim()
  const value   = String(formData.get("value") ?? "").trim() || null

  if (!toId)         return fail("Recipient is required.", "toId")
  if (toId === user.id) return fail("You cannot send kudos to yourself.", "toId")
  if (!message)      return fail("Message is required.", "message")
  if (message.length > 300) return fail("Message is too long (max 300 characters).", "message")

  const recipient = await db.user.findUnique({ where: { id: toId }, select: { id: true } })
  if (!recipient) return fail("Recipient not found.", "toId")

  // Budget check
  if (settings.kudosMonthlyBudget > 0) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const spent = await db.kudos.aggregate({
      where: { fromId: user.id, createdAt: { gte: monthStart } },
      _sum: { amount: true },
    })
    const spentSoFar = spent._sum.amount ?? 0
    if (spentSoFar + amount > settings.kudosMonthlyBudget) {
      return fail(`You only have ${settings.kudosMonthlyBudget - spentSoFar} coins left this month.`)
    }
  }

  await db.kudos.create({
    data: { fromId: user.id, toId, amount, message, value },
  })

  revalidatePath("/kudos")
  revalidatePath("/")
  return ok("Kudos sent!")
}

export async function redeemKudos(amount: number): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("Not authenticated.")

  const settings = await getSettings()
  if (!settings.kudosRedeemEnabled) return fail("Redemption is not enabled.")

  if (amount < 1) return fail("Invalid amount.")

  const [received, redeemed] = await Promise.all([
    db.kudos.aggregate({ where: { toId: user.id }, _sum: { amount: true } }),
    db.kudosRedemption.aggregate({
      where: { userId: user.id, status: { in: ["PENDING", "DONE"] } },
      _sum: { amount: true },
    }),
  ])

  const available = (received._sum.amount ?? 0) - (redeemed._sum.amount ?? 0)
  if (amount > available) return fail(`You only have ${available} coins available to redeem.`)

  const redemption = await db.kudosRedemption.create({
    data: { userId: user.id, amount, status: "PENDING" },
  })

  if (settings.kudosRedeemWebhook) {
    try {
      const res = await fetch(settings.kudosRedeemWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email, amount, redemptionId: redemption.id }),
        signal: AbortSignal.timeout(10_000),
      })
      const text = await res.text().catch(() => "")
      await db.kudosRedemption.update({
        where: { id: redemption.id },
        data: { status: res.ok ? "DONE" : "FAILED", webhookResponse: text.slice(0, 1000) },
      })
      if (!res.ok) return fail("Redemption webhook failed. Please try again later.")
    } catch (err) {
      await db.kudosRedemption.update({
        where: { id: redemption.id },
        data: { status: "FAILED", webhookResponse: String(err).slice(0, 1000) },
      })
      return fail("Redemption webhook failed. Please try again later.")
    }
  }

  revalidatePath("/kudos")
  return ok("Redemption submitted!")
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getKudosAdminList(page = 1, perPage = 30) {
  await requireRole("ADMIN")
  const [rows, total] = await Promise.all([
    db.kudos.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, amount: true, message: true, value: true, createdAt: true,
        from: { select: { id: true, name: true, email: true } },
        to:   { select: { id: true, name: true, email: true } },
      },
    }),
    db.kudos.count(),
  ])
  return { rows, total }
}

export async function deleteKudos(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await db.kudos.delete({ where: { id } })
  revalidatePath("/admin/kudos")
  revalidatePath("/kudos")
  return ok("Deleted.")
}

export async function saveKudosSettings(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")

  const budget = Math.max(0, parseInt(String(formData.get("kudosMonthlyBudget") ?? "100"), 10) || 0)
  const values = String(formData.get("kudosValues") ?? "").trim()
  const redeemEnabled = formData.get("kudosRedeemEnabled") === "true"
  const redeemWebhook = String(formData.get("kudosRedeemWebhook") ?? "").trim() || null
  const redeemRateLabel = String(formData.get("kudosRedeemRateLabel") ?? "").trim() || null

  await db.siteSettings.update({
    where: { id: "singleton" },
    data: { kudosMonthlyBudget: budget, kudosValues: values, kudosRedeemEnabled: redeemEnabled, kudosRedeemWebhook: redeemWebhook, kudosRedeemRateLabel: redeemRateLabel },
  })

  revalidatePath("/admin/modules/kudos")
  return ok("Kudos settings saved.")
}

export async function resetKudosBudgets(): Promise<ActionResult> {
  await requireRole("ADMIN")
  // Budget is computed on the fly from createdAt, so "reset" is a no-op in the DB.
  // This endpoint exists for external jobs that want to signal a reset via the API.
  // They can also call the REST endpoint POST /api/admin/kudos/reset-budgets.
  revalidatePath("/kudos")
  return ok("Budgets reset for the current month.")
}
