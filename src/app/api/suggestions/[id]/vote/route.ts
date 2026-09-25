import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMobileUser } from "@/lib/mobile-auth"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"

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

  const existing = await db.suggestionVote.findUnique({
    where: { suggestionId_userId: { suggestionId: id, userId: user.id } },
  })

  if (existing) {
    await db.suggestionVote.delete({ where: { id: existing.id } })
  } else {
    const suggestion = await db.suggestion.findUnique({ where: { id, hidden: false }, select: { id: true } })
    if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await db.suggestionVote.create({ data: { suggestionId: id, userId: user.id } })
  }

  const count = await db.suggestionVote.count({ where: { suggestionId: id } })
  return NextResponse.json({ voted: !existing, count })
}
