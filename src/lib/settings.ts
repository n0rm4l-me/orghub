import { cache } from "react"
import { db } from "@/lib/db"

/**
 * Reads the site settings singleton.
 *
 * This is a pure read: the row is seeded by migration
 * `20260827083000_seed_site_settings_singleton` and the initContainer runs
 * `prisma migrate deploy` before the app accepts traffic, so it always exists. It used
 * to be an upsert, which took a row lock on one row on every render and so serialised
 * renders across every replica.
 *
 * `cache()` dedupes the call within a single request, so a page that needs settings in
 * the layout and again in a child component issues one query instead of several.
 *
 * It throws rather than falling back to hardcoded defaults on purpose: several fields
 * are security-relevant (`localAuthEnabled` in particular), and silently serving a
 * default that re-enables password login would be worse than a visible failure.
 */
export const getSettings = cache(async () => {
  return db.siteSettings.findUniqueOrThrow({ where: { id: "singleton" } })
})
