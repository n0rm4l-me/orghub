"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, fail } from "@/lib/actions/types"

const HEX_COLOR = /^#[0-9a-f]{6}$/i

/** Rejects anything that is not an http(s) URL, including `javascript:` payloads. */
function validImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("ADMIN")

  const siteName = ((formData.get("siteName") as string) ?? "").trim()
  if (!siteName) return fail("Site name is required.", "siteName")
  if (siteName.length > 60) return fail("Site name must be 60 characters or fewer.", "siteName")

  const logoRaw = ((formData.get("logoUrl") as string) ?? "").trim()
  if (logoRaw && !validImageUrl(logoRaw))
    return fail("Enter a full image URL starting with https://", "logoUrl")

  const logoLightRaw = ((formData.get("logoOnLightUrl") as string) ?? "").trim()
  if (logoLightRaw && !validImageUrl(logoLightRaw))
    return fail("Enter a full image URL starting with https://", "logoOnLightUrl")

  const logos = { logoUrl: logoRaw || null, logoOnLightUrl: logoLightRaw || null }

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", siteName, ...logos },
    update: { siteName, ...logos },
  })

  await logAudit({
    userId: user.id,
    action: "settings.branding",
    resourceType: "SiteSettings",
    metadata: { siteName, ...logos },
  })

  // The header renders in the root layout, so every route's shell is stale.
  revalidatePath("/", "layout")
  return ok("Branding updated.")
}

export async function saveTheme(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("ADMIN")

  const primaryColor = ((formData.get("primaryColor") as string) ?? "").trim()
  if (!HEX_COLOR.test(primaryColor))
    return fail("Pick a colour in #rrggbb format.", "primaryColor")

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", primaryColor },
    update: { primaryColor },
  })

  await logAudit({
    userId: user.id,
    action: "settings.theme",
    resourceType: "SiteSettings",
    metadata: { primaryColor },
  })

  revalidatePath("/", "layout")
  return ok("Theme applied.")
}
