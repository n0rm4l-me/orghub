import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { parseModules } from "@/lib/modules"
import { getSettings } from "@/lib/settings"

export async function GET() {
  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("dining")) {
    return NextResponse.json({ error: "Module disabled" }, { status: 404 })
  }

  const venues = await db.venue.findMany({
    orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      venueType: true,
      location: { select: { name: true } },
    },
  })

  return NextResponse.json({ venues })
}
