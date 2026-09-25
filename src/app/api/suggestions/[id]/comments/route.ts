import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { createNotification } from "@/lib/notifications"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const settings = await getSettings()
  if (!parseModules(settings.enabledModules).has("suggestions")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  let body: { body?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const trimmed = body.body?.trim() ?? ""
  if (!trimmed || trimmed.length > 2000) {
    return NextResponse.json({ error: "Comment must be 1-2000 characters." }, { status: 400 })
  }

  const suggestion = await db.suggestion.findUnique({
    where: { id, hidden: false },
    select: { id: true, title: true, authorId: true },
  })
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdminReply = user.role === "ADMIN" || user.role === "EDITOR"

  const comment = await db.suggestionComment.create({
    data: { suggestionId: id, authorId: user.id, body: trimmed, isAdminReply },
    select: {
      id: true,
      body: true,
      isAdminReply: true,
      createdAt: true,
      authorId: true,
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  if (suggestion.authorId && suggestion.authorId !== user.id) {
    await createNotification(
      suggestion.authorId,
      "suggestion_comment",
      "New comment on your idea",
      suggestion.title,
      `/suggestions/${id}`,
    ).catch(() => {})
  }

  return NextResponse.json({ comment }, { status: 201 })
}
