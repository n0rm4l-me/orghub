import type { NextConfig } from "next"

const isProd = process.env.NODE_ENV === "production"

// The uploaded-media bucket is only same-origin (served through /uploads/[...path])
// when self-hosted storage is used; NEXT_PUBLIC_S3_PUBLIC_URL points at an external
// bucket when S3-compatible storage is configured instead, so img-src needs that
// host added dynamically rather than a value baked in at write time.
function s3ImgSrcHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_S3_PUBLIC_URL
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

// script-src needs 'unsafe-inline': Next.js's App Router itself emits inline
// <script>self.__next_f.push(...)</script> tags on every page to stream RSC
// payload/hydration data to the client, not just this app's own code. Broke
// production the first time this was written without it or a nonce (site
// stopped hydrating entirely: no menu, no client-side rendering at all).
// Removing it again requires the proxy.ts nonce approach from
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md,
// which forces dynamic rendering everywhere and is a bigger change to get
// right than a same-day follow-up fix should attempt. style-src needs it
// for a different, unrelated reason: dynamic per-row colors (tag swatches,
// poll result bars, etc.) are set via React's style prop across many
// components, which a nonce can't reach either way (nonces only cover
// <style>/<script> elements, not arbitrary style="" attributes).
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: https://www.gravatar.com${s3ImgSrcHost() ? ` ${s3ImgSrcHost()}` : ""}`,
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
]

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  // Isolates the browsing context from cross-origin popups/openers. Safe for this
  // app's auth flows: Okta/LDAP sign-in both redirect the top-level page rather
  // than relying on window.opener from a popup.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS: only in production (breaks local HTTP dev)
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
]

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["ldapts", "web-push"],
  env: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY ?? "",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
}

export default nextConfig
