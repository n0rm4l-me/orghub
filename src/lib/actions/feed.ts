"use server"

import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/rbac"

export async function markFeedSeen(): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return
  await db.user.update({ where: { id: user.id }, data: { lastFeedVisitAt: new Date() } })
}
