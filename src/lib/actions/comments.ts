"use server"

import { db } from "@/lib/db"
import { getCurrentUser, requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/lib/notifications"
import { type ActionResult, ok, fail } from "@/lib/actions/types"

const BODY_MAX = 2000

export async function addComment(
  articleId: string,
  body: string,
  parentId?: string,
): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return fail("Sign in to comment.")

  const trimmed = body.trim()
  if (!trimmed) return fail("Comment cannot be empty.")
  if (trimmed.length > BODY_MAX) return fail(`Comment must be ${BODY_MAX} characters or fewer.`)

  const article = await db.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, authorId: true },
  })
  if (!article) return fail("Article not found.")

  let parentAuthorId: string | null = null
  if (parentId) {
    const parent = await db.comment.findUnique({ where: { id: parentId }, select: { parentId: true, authorId: true } })
    if (!parent) return fail("Parent comment not found.")
    if (parent.parentId) return fail("Replies cannot be nested further.")
    parentAuthorId = parent.authorId
  }

  await db.comment.create({ data: { body: trimmed, authorId: user.id, articleId, parentId: parentId ?? null } })

  const href = `/articles/${articleId}`
  const snippet = trimmed.slice(0, 80)

  if (parentAuthorId && parentAuthorId !== user.id) {
    await createNotification(
      parentAuthorId,
      "comment.reply",
      `${user.name ?? "Someone"} replied to your comment`,
      snippet,
      href,
    )
  } else if (!parentId && article.authorId !== user.id) {
    await createNotification(
      article.authorId,
      "comment.new",
      `${user.name ?? "Someone"} commented on "${article.title}"`,
      snippet,
      href,
    )
  }

  revalidatePath(href)
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
