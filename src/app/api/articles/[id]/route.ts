import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const article = await db.article.findFirst({
    where: { id, published: true },
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
      coverImage: true,
      eventDate: true,
      eventEndDate: true,
      eventLocation: true,
      commentsEnabled: true,
      author: { select: { name: true, email: true, avatarUrl: true } },
      categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { reactions: true, views: true, comments: true } },
    },
  })

  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Optional auth: the route stays public, but a signed-in client needs its own
  // reaction state so the like button doesn't start out wrong.
  const user = await getMobileUser(req)
  const liked = user
    ? (await db.articleReaction.findUnique({
        where: { articleId_userId: { articleId: id, userId: user.id } },
        select: { articleId: true },
      })) !== null
    : false

  return NextResponse.json({
    ...article,
    categories: article.categories.map((c) => c.category),
    liked,
  })
}
