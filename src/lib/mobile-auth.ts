import { SignJWT, jwtVerify } from "jose"
import { db } from "@/lib/db"
import type { NextRequest } from "next/server"

const secret = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "dev-secret")

export async function signMobileToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret())
}

export async function getMobileUser(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const token = auth.slice(7)
  try {
    const { payload } = await jwtVerify(token, secret())
    if (!payload.sub) return null
    return db.user.findUnique({
      where: { id: payload.sub, active: true },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    })
  } catch {
    return null
  }
}
