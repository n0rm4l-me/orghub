"use server"

import { db } from "@/lib/db"
import { requireRole, getCurrentUser } from "@/lib/rbac"
import { createNotification } from "@/lib/notifications"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"
import type { SuggestionStatus } from "@prisma/client"
import { STATUS_LABEL } from "@/lib/suggestion-constants"

const REVALIDATE = () => revalidatePath("/suggestions")
const REVALIDATE_ADMIN = () => revalidatePath("/admin/suggestions")

// ─── Public queries ───────────────────────────────────────────────────────────

export async function getSuggestions(page = 1, perPage = 20, status?: SuggestionStatus, query?: string) {
  const user = await getCurrentUser()

  const where = {
    hidden: false,
    ...(status ? { status } : {}),
    ...(query ? { OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { body:  { contains: query, mode: "insensitive" as const } },
    ]} : {}),
  }

  const [rows, total] = await Promise.all([
    db.suggestion.findMany({
      where,
      orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        body: true,
        category: { select: { id: true, name: true } },
        status: true,
        adminNote: true,
        anonymous: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { votes: true, comments: true } },
        votes: user ? { where: { userId: user.id }, select: { id: true }, take: 1 } : false,
      },
    }),
    db.suggestion.count({ where }),
  ])

  return {
    rows: rows.map((r) => ({
      ...r,
      category: r.category?.name ?? null,
      author: r.anonymous ? null : r.author,
      voteCount: r._count.votes,
      commentCount: r._count.comments,
      voted: user ? r.votes.length > 0 : false,
    })),
    total,
  }
}

export async function getSuggestionDetail(id: string) {
  const user = await getCurrentUser()

  const s = await db.suggestion.findUnique({
    where: { id, hidden: false },
    select: {
      id: true,
      title: true,
      body: true,
      category: { select: { id: true, name: true } },
      status: true,
      adminNote: true,
      anonymous: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
      _count: { select: { votes: true } },
      votes: user ? { where: { userId: user.id }, select: { id: true }, take: 1 } : false,
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          isAdminReply: true,
          createdAt: true,
          authorId: true,
          author: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  })

  if (!s) return null

  return {
    ...s,
    category: s.category?.name ?? null,
    author: s.anonymous ? null : s.author,
    voteCount: s._count.votes,
    voted: user ? s.votes.length > 0 : false,
    currentUserId: user?.id ?? null,
  }
}

export async function getSuggestionAdminList(page = 1, perPage = 30, query?: string, status?: SuggestionStatus) {
  await requireRole("EDITOR")

  const where = {
    ...(status ? { status } : {}),
    ...(query ? { OR: [
      { title: { contains: query, mode: "insensitive" as const } },
      { body:  { contains: query, mode: "insensitive" as const } },
    ]} : {}),
  }

  const [rows, total] = await Promise.all([
    db.suggestion.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        body: true,
        category: { select: { id: true, name: true } },
        status: true,
        adminNote: true,
        anonymous: true,
        hidden: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
        _count: { select: { votes: true, comments: true } },
      },
    }),
    db.suggestion.count({ where }),
  ])

  return {
    rows: rows.map((r) => ({ ...r, category: r.category?.name ?? null })),
    total,
  }
}

// ─── Employee actions ─────────────────────────────────────────────────────────

export async function submitSuggestion(data: {
  title: string
  body: string
  categoryId?: string
  anonymous?: boolean
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("VIEWER")

  const title = data.title.trim()
  const body  = data.body.trim()

  if (!title || title.length > 200) return fail("Title must be 1–200 characters.")
  if (!body  || body.length > 5000) return fail("Body must be 1–5000 characters.")

  const anonymous = data.anonymous ?? false

  const suggestion = await db.suggestion.create({
    data: {
      title,
      body,
      categoryId: data.categoryId || null,
      // Anonymous submissions store no link to the submitter at all: masking the
      // author on read would still leave `authorId` recoverable from the database,
      // a backup or a replica. The trade-off is that an anonymous author cannot be
      // notified about status changes or replies.
      authorId: anonymous ? null : user.id,
      anonymous,
    },
  })

  REVALIDATE()
  REVALIDATE_ADMIN()
  return okWith({ id: suggestion.id })
}

export async function toggleVote(suggestionId: string): Promise<ActionResult<{ voted: boolean; count: number }>> {
  const user = await requireRole("VIEWER")

  const existing = await db.suggestionVote.findUnique({
    where: { suggestionId_userId: { suggestionId, userId: user.id } },
  })

  if (existing) {
    await db.suggestionVote.delete({ where: { id: existing.id } })
  } else {
    await db.suggestionVote.create({ data: { suggestionId, userId: user.id } })
  }

  const count = await db.suggestionVote.count({ where: { suggestionId } })
  REVALIDATE()
  return okWith({ voted: !existing, count })
}

// ─── Admin actions ────────────────────────────────────────────────────────────

export async function updateSuggestionStatus(
  id: string,
  status: SuggestionStatus,
  adminNote?: string,
): Promise<ActionResult> {
  const admin = await requireRole("EDITOR")

  const suggestion = await db.suggestion.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true, status: true },
  })
  if (!suggestion) return fail("Not found.")

  await db.suggestion.update({
    where: { id },
    data: { status, ...(adminNote !== undefined ? { adminNote: adminNote.trim() || null } : {}) },
  })

  // Notify the author if status changed
  if (suggestion.authorId && suggestion.status !== status) {
    const label = STATUS_LABEL[status] ?? status
    await createNotification(
      suggestion.authorId,
      "suggestion_status",
      `Your suggestion status: ${label}`,
      suggestion.title,
      "/suggestions",
    ).catch(() => {})
  }

  REVALIDATE()
  REVALIDATE_ADMIN()
  return ok()
}

export async function toggleHideSuggestion(id: string): Promise<void> {
  await requireRole("EDITOR")

  const s = await db.suggestion.findUnique({ where: { id }, select: { hidden: true } })
  if (!s) return

  await db.suggestion.update({ where: { id }, data: { hidden: !s.hidden } })
  REVALIDATE()
  REVALIDATE_ADMIN()
}

export async function deleteSuggestion(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await db.suggestion.delete({ where: { id } })
  REVALIDATE()
  REVALIDATE_ADMIN()
  return ok("Saved.")
}

export async function updateAdminNote(id: string, note: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  await db.suggestion.update({ where: { id }, data: { adminNote: note.trim() || null } })
  REVALIDATE()
  REVALIDATE_ADMIN()
  return ok()
}

export async function addComment(suggestionId: string, body: string): Promise<ActionResult> {
  const user = await requireRole("VIEWER")

  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 2000) return fail("Comment must be 1–2000 characters.")

  const suggestion = await db.suggestion.findUnique({
    where: { id: suggestionId, hidden: false },
    select: { id: true, title: true, authorId: true },
  })
  if (!suggestion) return fail("Not found.")

  const isAdminReply = user.role === "ADMIN" || user.role === "EDITOR"

  await db.suggestionComment.create({
    data: { suggestionId, authorId: user.id, body: trimmed, isAdminReply },
  })

  // Notify author if they exist and aren't the commenter
  if (suggestion.authorId && suggestion.authorId !== user.id) {
    await createNotification(
      suggestion.authorId,
      "suggestion_comment",
      "New comment on your idea",
      suggestion.title,
      `/suggestions/${suggestionId}`,
    ).catch(() => {})
  }

  revalidatePath(`/suggestions/${suggestionId}`)
  REVALIDATE_ADMIN()
  return ok()
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await requireRole("VIEWER")

  const comment = await db.suggestionComment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, suggestionId: true },
  })
  if (!comment) return fail("Not found.")

  const isOwner = comment.authorId === user.id
  const isAdmin = user.role === "ADMIN" || user.role === "EDITOR"
  if (!isOwner && !isAdmin) return fail("Not allowed.")

  await db.suggestionComment.delete({ where: { id: commentId } })
  revalidatePath(`/suggestions/${comment.suggestionId}`)
  REVALIDATE_ADMIN()
  return ok()
}

