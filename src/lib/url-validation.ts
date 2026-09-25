/**
 * Not a "use server" module on purpose: files with that directive can only
 * export async server actions, so this plain sync helper has to live
 * elsewhere to be shared between them (see nav.ts and announcements.ts).
 */
export function validUrl(raw: string): boolean {
  // Site-relative paths are allowed so links can point at internal routes.
  if (raw.startsWith("/")) return true
  try {
    const url = new URL(raw)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}
