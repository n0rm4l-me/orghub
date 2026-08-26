import { createHash } from "crypto"

/** Returns a Gravatar URL. Uses d=404 so AvatarImage falls back to initials when no photo exists. */
export function gravatarUrl(email: string, size = 80): string {
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex")
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`
}
