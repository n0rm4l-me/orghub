import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["ldapts"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
}

export default nextConfig
