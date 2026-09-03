import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { parseModules } from "@/lib/modules"
import { getSettings } from "@/lib/settings"

export async function GET(req: NextRequest) {
  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("events")) {
    return NextResponse.json({ error: "Module disabled" }, { status: 404 })
  }

  const { searchParams } = req.nextUrl
  const raw = searchParams.get("month") ?? ""
  let year: number, month: number
  if (/^\d{4}-\d{2}$/.test(raw)) {
    ;[year, month] = raw.split("-").map(Number)
  } else {
    const now = new Date()
    year = now.getFullYear()
    month = now.getMonth() + 1
  }

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 1)

  const events = await db.article.findMany({
    where: { published: true, eventDate: { gte: monthStart, lt: monthEnd } },
    orderBy: { eventDate: "asc" },
    select: { id: true, title: true, eventDate: true, eventEndDate: true, eventLocation: true },
  })

  return NextResponse.json({ events })
}
