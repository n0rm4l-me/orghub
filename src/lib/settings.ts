import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

export const SETTINGS_CACHE_TAG = "settings"

/**
 * Reads the site settings singleton.
 *
 * `unstable_cache` caches across requests (1 h TTL) so the root layout no longer
 * forces the entire app to be dynamic. Mutations that change settings call
 * `revalidateTag(SETTINGS_CACHE_TAG)` to bust the cache immediately.
 *
 * It throws rather than falling back to hardcoded defaults on purpose: several fields
 * are security-relevant (`localAuthEnabled` in particular), and silently serving a
 * default that re-enables password login would be worse than a visible failure.
 */
export const getSettings = unstable_cache(
  async () => db.siteSettings.findUniqueOrThrow({ where: { id: "singleton" } }),
  [SETTINGS_CACHE_TAG],
  { tags: [SETTINGS_CACHE_TAG], revalidate: 3600 },
)
