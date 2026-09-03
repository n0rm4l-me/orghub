import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { signMobileToken } from "@/lib/mobile-auth"
import { authenticateLdap } from "@/lib/ldap"

const DUMMY_HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { email, password } = body
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 })
  }

  try {
    // 1. Try local auth (passwordHash)
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, active: true, passwordHash: true, avatarUrl: true },
    })

    const hash = user?.active && user.passwordHash ? user.passwordHash : DUMMY_HASH
    const matches = await bcrypt.compare(password, hash)

    if (matches && user && user.active && user.passwordHash) {
      const token = await signMobileToken(user.id)
      return NextResponse.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      })
    }

    // 2. Try LDAP / AD auth
    const ldapUser = await authenticateLdap(email, password)
    if (ldapUser) {
      const dbUser = await db.user.upsert({
        where: { email: ldapUser.email },
        create: {
          email: ldapUser.email,
          name: ldapUser.name,
          department: ldapUser.department ?? null,
          role: "VIEWER",
          provider: "ldap",
          active: true,
        },
        update: {
          name: ldapUser.name,
          ...(ldapUser.department ? { department: ldapUser.department } : {}),
          provider: "ldap",
        },
        select: { id: true, email: true, name: true, role: true, active: true, avatarUrl: true },
      })

      if (!dbUser.active) {
        return NextResponse.json({ error: "Account is deactivated" }, { status: 403 })
      }

      const token = await signMobileToken(dbUser.id)
      return NextResponse.json({
        token,
        user: { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role, avatarUrl: dbUser.avatarUrl },
      })
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  } catch (err) {
    console.error("[mobile-login] error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
