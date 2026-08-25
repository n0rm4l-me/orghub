"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, fail } from "@/lib/actions/types"
import type { Role } from "@prisma/client"

const ROLES: Role[] = ["VIEWER", "EDITOR", "ADMIN"]

/** Refuses the change if it would leave nobody able to administer the site. */
async function wouldOrphanAdmins(targetId: string): Promise<boolean> {
  const remaining = await db.user.count({
    where: { role: "ADMIN", active: true, id: { not: targetId } },
  })
  return remaining === 0
}

export async function changeUserRole(userId: string, role: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN")

  if (!ROLES.includes(role as Role)) return fail("Unknown role.")
  const next = role as Role

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  })
  if (!target) return fail("This user no longer exists.")
  if (target.role === next) return ok()

  if (target.role === "ADMIN" && next !== "ADMIN" && (await wouldOrphanAdmins(userId)))
    return fail("This is the last active admin. Promote someone else first.")

  await db.user.update({ where: { id: userId }, data: { role: next } })

  await logAudit({
    userId: actor.id,
    action: "user.role_change",
    resourceType: "User",
    resourceId: userId,
    metadata: { email: target.email, from: target.role, to: next },
  })

  revalidatePath("/admin/users")
  return ok(`${target.name ?? target.email} is now ${next.toLowerCase()}.`)
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN")

  if (userId === actor.id && !active)
    return fail("You cannot deactivate your own account.")

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  })
  if (!target) return fail("This user no longer exists.")
  if (target.active === active) return ok()

  if (!active && target.role === "ADMIN" && (await wouldOrphanAdmins(userId)))
    return fail("This is the last active admin. Promote someone else first.")

  await db.user.update({ where: { id: userId }, data: { active } })

  await logAudit({
    userId: actor.id,
    action: active ? "user.reactivate" : "user.deactivate",
    resourceType: "User",
    resourceId: userId,
    metadata: { email: target.email },
  })

  revalidatePath("/admin/users")
  const who = target.name ?? target.email
  return ok(active ? `${who} can sign in again.` : `${who} was deactivated.`)
}
