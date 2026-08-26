"use server"

import { db } from "@/lib/db"
import { getCurrentUser, requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, fail } from "@/lib/actions/types"

const BODY_MAX = 2000

export async function addComment(articleId: string, body: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("Sign in to comment.")

  const trimmed = body.trim()
  if (!trimmed) return fail("Comment cannot be empty.")
  if (trimmed.length > BODY_MAX) return fail(`Comment must be ${BODY_MAX} characters or fewer.`)

  const article = await db.article.findUnique({ where: { id: articleId }, select: { id: true } })
  if (!article) return fail("Article not found.")

  await db.comment.create({ data: { body: trimmed, authorId: user.id, articleId } })

  revalidatePath(`/articles/${articleId}`)
  return ok("Comment posted.")
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("Not authenticated.")

  const comment = await db.comment.findUnique({ where: { id }, select: { authorId: true, articleId: true } })
  if (!comment) return fail("Comment not found.")

  const isOwn = comment.authorId === user.id
  const canModerate = user.role === "ADMIN" || user.role === "EDITOR"
  if (!isOwn && !canModerate) return fail("Not allowed.")

  await db.comment.delete({ where: { id } })

  revalidatePath(`/articles/${comment.articleId}`)
  return ok("Comment deleted.")
}
