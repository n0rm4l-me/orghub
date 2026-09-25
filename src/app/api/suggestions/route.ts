import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import type { SuggestionStatus } from "@prisma/client"

const PER_PAGE = 20
const VALID_STATUSES = new Set<SuggestionStatus>(["OPEN", "UNDER_REVIEW", "PLANNED", "DONE", "DECLINED"])

export async function GET(req: NextRequest) {
  const settings = await getSettings()
  if (!parseModules(settings.enabledModules).has("suggestions")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const user = await getMobileUser(req)
  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const statusParam = searchParams.get("status")
  if (statusParam && !VALID_STATUSES.has(statusParam as SuggestionStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }
  const status = statusParam as SuggestionStatus | null

  const where = {
    hidden: false,
    ...(status ? { status } : {}),
  }

  const [rows, total] = await Promise.all([
    db.suggestion.findMany({
      where,
      orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        title: true,
        body: true,
        category: { select: { id: true, name: true } },
        status: true,
        anonymous: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        _count: { select: { votes: true, comments: true } },
        votes: user ? { where: { userId: user.id }, select: { id: true }, take: 1 } : false,
      },
    }),
    db.suggestion.count({ where }),
  ])

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      category: r.category?.name ?? null,
      status: r.status,
      anonymous: r.anonymous,
      createdAt: r.createdAt,
      author: r.anonymous ? null : r.author,
      voteCount: r._count.votes,
      commentCount: r._count.comments,
      voted: user ? r.votes.length > 0 : false,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PER_PAGE),
  })
}

export async function POST(req: NextRequest) {
  const settings = await getSettings()
  if (!parseModules(settings.enabledModules).has("suggestions")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { title?: string; body?: string; anonymous?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const title = body.title?.trim() ?? ""
  const text = body.body?.trim() ?? ""
  if (!title || title.length > 200) return NextResponse.json({ error: "Title must be 1-200 characters." }, { status: 400 })
  if (!text || text.length > 5000) return NextResponse.json({ error: "Body must be 1-5000 characters." }, { status: 400 })

  const anonymous = body.anonymous ?? false

  // No categoryId here: the mobile submit flow doesn't offer a category
  // picker yet (v1 scope cut, see ROADMAP.md), so every mobile-submitted
  // suggestion lands uncategorized, same as leaving it blank on the web form.
  const suggestion = await db.suggestion.create({
    data: {
      title,
      body: text,
      authorId: anonymous ? null : user.id,
      anonymous,
    },
    select: { id: true },
  })

  return NextResponse.json({ id: suggestion.id }, { status: 201 })
}
