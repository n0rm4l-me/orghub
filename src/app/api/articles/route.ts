import { db } from "@/lib/db"
import { NextRequest } from "next/server"

const PER_PAGE = 20
const WORDS_PER_MINUTE = 200
const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const category = searchParams.get("category") || undefined

  const where = {
    published: true,
    ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
  }

  const [articles, total] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        title: true,
        excerpt: true,
        coverImage: true,
        pinned: true,
        important: true,
        publishedAt: true,
        wordCount: true,
        _count: { select: { reactions: true } },
        categories: {
          take: 1,
          select: { category: { select: { name: true, slug: true } } },
        },
      },
    }),
    db.article.count({ where }),
  ])

  const now = Date.now()

  return Response.json({
    articles: articles.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt ?? null,
      coverImage: a.coverImage ?? null,
      pinned: a.pinned,
      important: a.important,
      isNew: a.publishedAt ? now - a.publishedAt.getTime() < NEW_THRESHOLD_MS : false,
      date: a.publishedAt
        ? a.publishedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : null,
      readTime: `${Math.max(1, Math.round((a.wordCount ?? 0) / WORDS_PER_MINUTE))} min read`,
      reactionCount: a._count.reactions,
      category: a.categories[0]?.category ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PER_PAGE),
  })
}
