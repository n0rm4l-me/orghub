import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const article = await db.article.findFirst({ where: { id, published: true }, select: { id: true } })
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existing = await db.articleReaction.findUnique({
    where: { articleId_userId: { articleId: id, userId: user.id } },
  })

  if (existing) {
    await db.articleReaction.delete({ where: { articleId_userId: { articleId: id, userId: user.id } } })
  } else {
    await db.articleReaction.create({ data: { articleId: id, userId: user.id } })
  }

  const count = await db.articleReaction.count({ where: { articleId: id } })
  return NextResponse.json({ liked: !existing, count })
}
