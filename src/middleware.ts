import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// In-memory rate limiter — single-pod only.
// For multi-pod k8s, use ingress-level rate limiting (e.g. nginx-ingress limit_req).
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

const hits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count++
  if (entry.count > MAX_ATTEMPTS) return true
  return false
}

const { auth } = NextAuth(authConfig)

export default async function middleware(req: NextRequest) {
  if (req.method === "POST" && req.nextUrl.pathname.startsWith("/api/auth/callback/")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown"

    if (isRateLimited(ip)) {
      return new NextResponse("Too many requests", { status: 429 })
    }
  }

  return auth(req as unknown as Parameters<typeof auth>[0])
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/auth/callback/:path*"],
}
