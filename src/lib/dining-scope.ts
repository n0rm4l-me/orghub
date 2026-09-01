import { db } from "@/lib/db"
import type { Role } from "@prisma/client"

/**
 * The one location an EDITOR may manage, or null for an ADMIN meaning "all of
 * them". An editor with no location assigned resolves to a sentinel that no row
 * can match, so a missing assignment fails closed instead of granting access to
 * every location.
 */
export async function scopedLocationId(userId: string, role: Role): Promise<string | null> {
  if (role === "ADMIN") return null
  const u = await db.user.findUnique({ where: { id: userId }, select: { locationId: true } })
  return u?.locationId ?? "none"
}

/**
 * Scope for any model that has a `locationId` (Venue and friends). Spread into
 * a Prisma `where`. Used by both the admin page reads and the server actions so
 * that what an editor can see and what they can change cannot drift apart.
 */
export async function locationFilter(userId: string, role: Role) {
  const id = await scopedLocationId(userId, role)
  return id === null ? {} : { locationId: id }
}
