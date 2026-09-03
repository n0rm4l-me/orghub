"use server"

import { db } from "@/lib/db"
import { requireRole, getCurrentUser } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { createNotification } from "@/lib/notifications"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"
import { logAudit } from "@/lib/audit"

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

  const txResult = await db.$transaction(async (tx) => {
    if (settings.kudosMonthlyBudget > 0) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const spent = await tx.kudos.aggregate({
        where: { fromId: user.id, createdAt: { gte: monthStart } },
        _sum: { amount: true },
      })
      const spentSoFar = spent._sum.amount ?? 0
      if (spentSoFar + amount > settings.kudosMonthlyBudget) {
        return { error: `You only have ${settings.kudosMonthlyBudget - spentSoFar} coins left this month.` }
      }
    }
    const kudos = await tx.kudos.create({
      data: { fromId: user.id, toId, amount, message, value },
      select: { from: { select: { name: true, email: true } } },
    })
    return { kudos }
  })
  if ("error" in txResult) return fail(txResult.error as string)
  const kudos = txResult.kudos

  const fromName = kudos.from.name ?? kudos.from.email.split("@")[0]
  await createNotification(
    toId,
    "kudos.received",
    `${fromName} sent you kudos`,
    message.slice(0, 80),
    "/kudos",
  ).catch(() => {})

  await logAudit({ userId: user.id, action: "kudos.send", resourceType: "Kudos", metadata: { toId, amount } })
  revalidatePath("/kudos")
  revalidatePath("/admin/kudos")
  revalidatePath("/")
  return ok("Kudos sent!")
}

export async function redeemKudos(amount: number, typeId?: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("Not authenticated.")

  const settings = await getSettings()
  if (!settings.kudosRedeemEnabled) return fail("Redemption is not enabled.")

  if (amount < 1) return fail("Invalid amount.")

  let resolvedTypeId: string | null = null
  let webhookUrl = settings.kudosRedeemWebhook

  if (typeId) {
    const redeemType = await db.kudosRedeemType.findUnique({
      where: { id: typeId, active: true },
      select: { id: true, webhook: true },
    })
    if (!redeemType) return fail("Invalid redemption type.")
    resolvedTypeId = redeemType.id
    if (redeemType.webhook) webhookUrl = redeemType.webhook
  }

  const txResult = await db.$transaction(async (tx) => {
    const [received, redeemed] = await Promise.all([
      tx.kudos.aggregate({ where: { toId: user.id }, _sum: { amount: true } }),
      tx.kudosRedemption.aggregate({
        where: { userId: user.id, status: { in: ["PENDING", "DONE"] } },
        _sum: { amount: true },
      }),
    ])
    const available = (received._sum.amount ?? 0) - (redeemed._sum.amount ?? 0)
    if (amount > available) {
      return { error: `You only have ${available} coins available to redeem.` }
    }
    const redemption = await tx.kudosRedemption.create({
      data: { userId: user.id, amount, status: "PENDING", typeId: resolvedTypeId },
    })
    return { redemption }
  })
  if ("error" in txResult) return fail(txResult.error as string)
  const redemption = txResult.redemption

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email, amount, redemptionId: redemption.id, typeId: resolvedTypeId }),
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

  await logAudit({ userId: user.id, action: "kudos.redeem", resourceType: "KudosRedemption", resourceId: redemption.id, metadata: { amount } })
  revalidatePath("/kudos")
  revalidatePath("/admin/kudos/redemptions")
  return ok("Redemption submitted!")
}

export async function getMyRedemptions(page = 1, perPage = 5) {
  const user = await getCurrentUser()
  if (!user) return { rows: [], total: 0 }
  const [rows, total] = await Promise.all([
    db.kudosRedemption.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, amount: true, status: true, createdAt: true, redeemType: { select: { label: true } } },
    }),
    db.kudosRedemption.count({ where: { userId: user.id } }),
  ])
  return { rows, total }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getKudosStats() {
  await requireRole("ADMIN")
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [topRecipients, topSenders, valueGroups, totalThisMonth, totalAllTime] = await Promise.all([
    db.kudos.groupBy({
      by: ["toId"],
      where: { createdAt: { gte: monthStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    db.kudos.groupBy({
      by: ["fromId"],
      where: { createdAt: { gte: monthStart } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    db.kudos.groupBy({
      by: ["value"],
      where: { createdAt: { gte: monthStart }, value: { not: null } },
      _count: { value: true },
      orderBy: { _count: { value: "desc" } },
      take: 5,
    }),
    db.kudos.count({ where: { createdAt: { gte: monthStart } } }),
    db.kudos.count(),
  ])

  const recipientIds = topRecipients.map((r) => r.toId)
  const senderIds = topSenders.map((s) => s.fromId)
  const allIds = [...new Set([...recipientIds, ...senderIds])]
  const users = await db.user.findMany({
    where: { id: { in: allIds } },
    select: { id: true, name: true, email: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  return {
    totalThisMonth,
    totalAllTime,
    topRecipients: topRecipients.map((r) => ({
      user: userMap.get(r.toId)!,
      total: r._sum.amount ?? 0,
    })),
    topSenders: topSenders.map((s) => ({
      user: userMap.get(s.fromId)!,
      total: s._sum.amount ?? 0,
    })),
    topValues: valueGroups
      .filter((v) => v.value)
      .map((v) => ({ value: v.value!, count: v._count.value })),
  }
}

export async function getKudosAdminList(page = 1, perPage = 30, query?: string) {
  await requireRole("ADMIN")
  const where = query ? {
    OR: [
      { message: { contains: query, mode: "insensitive" as const } },
      { value:   { contains: query, mode: "insensitive" as const } },
      { from: { OR: [
        { name:  { contains: query, mode: "insensitive" as const } },
        { email: { contains: query, mode: "insensitive" as const } },
      ]}},
      { to: { OR: [
        { name:  { contains: query, mode: "insensitive" as const } },
        { email: { contains: query, mode: "insensitive" as const } },
      ]}},
    ],
  } : {}
  const [rows, total] = await Promise.all([
    db.kudos.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, amount: true, message: true, value: true, createdAt: true,
        from: { select: { id: true, name: true, email: true } },
        to:   { select: { id: true, name: true, email: true } },
      },
    }),
    db.kudos.count({ where }),
  ])
  return { rows, total }
}

export async function getKudosRedemptions(page = 1, perPage = 30, query?: string, status?: string) {
  await requireRole("ADMIN")
  const where = {
    ...(status ? { status: status as "PENDING" | "DONE" | "FAILED" | "REJECTED" } : {}),
    ...(query ? { user: { OR: [
      { name:  { contains: query, mode: "insensitive" as const } },
      { email: { contains: query, mode: "insensitive" as const } },
    ]}} : {}),
  }
  const [rows, total] = await Promise.all([
    db.kudosRedemption.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, amount: true, status: true, createdAt: true, webhookResponse: true,
        user: { select: { id: true, name: true, email: true } },
        redeemType: { select: { id: true, label: true } },
      },
    }),
    db.kudosRedemption.count({ where }),
  ])
  return { rows, total }
}

export async function getRedeemTypes(activeOnly = false) {
  return db.kudosRedeemType.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ order: "asc" }, { label: "asc" }],
  })
}

export async function createRedeemType(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const label = String(formData.get("label") ?? "").trim()
  if (!label) return fail("Label is required.")
  const rateLabel = String(formData.get("rateLabel") ?? "").trim() || null
  const webhook = String(formData.get("webhook") ?? "").trim() || null

  const agg = await db.kudosRedeemType.aggregate({ _max: { order: true } })
  const order = (agg._max.order ?? -1) + 1

  await db.kudosRedeemType.create({ data: { label, rateLabel, webhook, order } })
  revalidatePath("/admin/modules/kudos")
  return ok("Type created.")
}

export async function updateRedeemType(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const label = String(formData.get("label") ?? "").trim()
  if (!label) return fail("Label is required.")
  const rateLabel = String(formData.get("rateLabel") ?? "").trim() || null
  const webhook = String(formData.get("webhook") ?? "").trim() || null
  const activeRaw = formData.get("active")
  const active = activeRaw !== null ? activeRaw === "true" : undefined

  await db.kudosRedeemType.update({
    where: { id },
    data: { label, rateLabel, webhook, ...(active !== undefined ? { active } : {}) },
  })
  revalidatePath("/admin/modules/kudos")
  return ok("Type updated.")
}

export async function deleteRedeemType(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await db.kudosRedeemType.delete({ where: { id } })
  revalidatePath("/admin/modules/kudos")
  return ok("Type deleted.")
}

export async function rejectRedemption(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  const r = await db.kudosRedemption.findUnique({ where: { id }, select: { status: true } })
  if (!r) return fail("Not found.")
  if (r.status !== "PENDING") return fail("Only PENDING redemptions can be rejected.")
  await db.kudosRedemption.update({ where: { id }, data: { status: "REJECTED" } })
  revalidatePath("/admin/kudos/redemptions")
  revalidatePath("/kudos")
  return ok("Rejected.")
}

export async function deleteKudos(id: string): Promise<ActionResult> {
  const user = await requireRole("ADMIN")
  await db.kudos.delete({ where: { id } })
  await logAudit({ userId: user.id, action: "kudos.delete", resourceType: "Kudos", resourceId: id })
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
