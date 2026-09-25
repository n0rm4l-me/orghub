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

// script-src has no 'unsafe-inline': the one inline script this app used to need
// (theme/font-size FOUC prevention) now loads from public/theme-init.js by src
// instead, specifically so this can stay strict. style-src does need it: dynamic
// per-row colors (tag swatches, poll result bars, etc.) are set via React's style
// prop across many components, which a nonce can't reach (nonces only cover
// <style>/<script> elements, not arbitrary style="" attributes), and rewriting
// all of them to avoid it is a much larger, visually-risky change on its own.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self'${isProd ? "" : " 'unsafe-eval'"}`,
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
