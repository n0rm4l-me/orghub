import { NextRequest, NextResponse } from "next/server"
import { getMobileUser } from "@/lib/mobile-auth"

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ user })
}
