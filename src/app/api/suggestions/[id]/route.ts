import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const settings = await getSettings()
  if (!parseModules(settings.enabledModules).has("suggestions")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const user = await getMobileUser(req)
  const { id } = await params

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
      author: { select: { id: true, name: true } },
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
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
    },
  })

  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    id: s.id,
    title: s.title,
    body: s.body,
    category: s.category?.name ?? null,
    status: s.status,
    adminNote: s.adminNote,
    anonymous: s.anonymous,
    createdAt: s.createdAt,
    author: s.anonymous ? null : s.author,
    voteCount: s._count.votes,
    voted: user ? s.votes.length > 0 : false,
    currentUserId: user?.id ?? null,
    comments: s.comments,
  })
}
