import { cache } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import type { Role } from "@prisma/client"

/** Higher number wins. Used for `hasRole` comparisons. */
const RANK: Record<Role, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
}

export type CurrentUser = {
  id: string
  email: string
  name: string | null
  role: Role
  active: boolean
}

const getSession = cache(auth)

/**
 * Resolves the signed-in user from the database rather than the JWT.
 *
 * The JWT carries a `role` claim captured at sign-in, which goes stale as soon
 * as an admin changes someone's role or deactivates them. Authorization
 * decisions must not trust it. `cache()` dedupes this to one query per request.
 *
 * Returns null when there is no session, the account was removed, or it was
 * deactivated: all three mean "not allowed to act".
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession()
  if (!session?.user?.id) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, active: true },
  })

  if (!user || !user.active) return null
  return user
})

export function hasRole(user: CurrentUser | null, min: Role): boolean {
  if (!user) return false
  return RANK[user.role] >= RANK[min]
}

/**
 * Guards a page or server action.
 *
 * Denials land on `/no-access`, which sits outside the `/admin` layout on
 * purpose: sending an under-privileged user to an admin route that re-runs this
 * same check would redirect forever. Holding a valid cookie for a deactivated
 * account is likewise routed there rather than to `/login`, since the middleware
 * bounces signed-in visitors straight back off the login page.
 */
export async function requireRole(min: Role): Promise<CurrentUser> {
  const session = await getSession()
  if (!session?.user?.id) redirect("/login")

  const user = await getCurrentUser()
  if (!user) redirect("/no-access?reason=inactive")
  if (!hasRole(user, min)) redirect(`/no-access?reason=role&need=${min.toLowerCase()}`)

  return user
}

/** Capability checks, kept close to the UI vocabulary. */
export const can = {
  manageContent: (u: CurrentUser | null) => hasRole(u, "EDITOR"),
  manageUsers: (u: CurrentUser | null) => hasRole(u, "ADMIN"),
  manageSettings: (u: CurrentUser | null) => hasRole(u, "ADMIN"),
  viewAudit: (u: CurrentUser | null) => hasRole(u, "ADMIN"),
}
