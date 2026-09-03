import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const article = await db.article.findFirst({ where: { id, published: true }, select: { id: true } })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const comments = await db.comment.findMany({
    where: { articleId: id, parentId: null },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      replies: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  })

  return NextResponse.json({ comments })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const article = await db.article.findFirst({
    where: { id, published: true, commentsEnabled: true },
    select: { id: true },
  })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let body: { body?: string; parentId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  if (!body.body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 })

  if (body.parentId) {
    const parent = await db.comment.findUnique({ where: { id: body.parentId, articleId: id }, select: { parentId: true } })
    if (!parent || parent.parentId) return NextResponse.json({ error: "Invalid parentId" }, { status: 400 })
  }

  const comment = await db.comment.create({
    data: { body: body.body.trim(), articleId: id, authorId: user.id, parentId: body.parentId ?? null },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      replies: { select: { id: true } },
    },
  })

  return NextResponse.json({ comment }, { status: 201 })
}
