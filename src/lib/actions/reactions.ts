"use server"

import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/rbac"
import { type ActionResult, fail, okWith } from "@/lib/actions/types"

export async function toggleReaction(
  articleId: string
): Promise<ActionResult<{ count: number; liked: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return fail("Sign in to react to articles.")

  const key = { articleId, userId: user.id }

  const existing = await db.articleReaction.findUnique({ where: { articleId_userId: key } })

  if (existing) {
    await db.articleReaction.delete({ where: { articleId_userId: key } })
  } else {
    await db.articleReaction.create({ data: key })
  }

  const count = await db.articleReaction.count({ where: { articleId } })
  return okWith({ count, liked: !existing }, existing ? "" : "")
}
