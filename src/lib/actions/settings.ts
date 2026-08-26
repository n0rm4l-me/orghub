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

  const colorRaw = ((formData.get("primaryColor") as string) ?? "").trim()
  if (colorRaw && !HEX_COLOR.test(colorRaw))
    return fail("Pick a colour in #rrggbb format.", "primaryColor")

  const logos = { logoUrl: logoRaw || null, logoOnLightUrl: logoLightRaw || null }
  const color = colorRaw ? { primaryColor: colorRaw } : {}

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", siteName, ...logos, ...color },
    update: { siteName, ...logos, ...color },
  })

  await logAudit({
    userId: user.id,
    action: "settings.branding",
    resourceType: "SiteSettings",
    metadata: { siteName, ...logos, ...color },
  })

  revalidatePath("/", "layout")
  return ok("Branding saved.")
}

import { MODULES, type ModuleId } from "@/lib/modules"

const SIDEBAR_BLOCK_IDS = new Set(["quickLinks", "browseByTopic", "upcomingEvents"])
const VALID_MODULE_IDS = new Set(Object.keys(MODULES) as ModuleId[])

export async function saveSidebarWidgets(
  right: string[],
  left: string[],
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const all = [...right, ...left]
  if (!all.every((id) => SIDEBAR_BLOCK_IDS.has(id)) || new Set(all).size !== all.length)
    return fail("Invalid widget placement.")

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", sidebarOrder: right.join(","), leftSidebarOrder: left.join(",") },
    update: { sidebarOrder: right.join(","), leftSidebarOrder: left.join(",") },
  })

  await logAudit({
    userId: user.id,
    action: "settings.navigation",
    resourceType: "SiteSettings",
    metadata: { rightSidebar: right, leftSidebar: left },
  })

  revalidatePath("/", "layout")
  return ok("Sidebar widgets saved.")
}

export async function saveEnabledModules(modules: string[]): Promise<ActionResult> {
  const user = await requireRole("ADMIN")

  if (!modules.every((id) => VALID_MODULE_IDS.has(id as ModuleId)))
    return fail("Unknown module ID.")

  const value = [...new Set(modules)].join(",")

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", enabledModules: value },
    update: { enabledModules: value },
  })

  await logAudit({
    userId: user.id,
    action: "settings.modules",
    resourceType: "SiteSettings",
    metadata: { enabledModules: modules },
  })

  revalidatePath("/", "layout")
  return ok("Module settings saved.")
}


const VALID_LAYOUTS     = new Set(["content", "sidebar-right", "sidebar-left", "sidebar-both"])
const VALID_WIDTHS      = new Set(["narrow", "default", "wide"])
const VALID_PAGE_SIZE   = new Set([5, 10, 15, 20, 25, 30])
const VALID_CARD_STYLES = new Set(["compact", "default", "preview"])

export async function saveLayout(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("ADMIN")

  const feedLayout    = (formData.get("feedLayout")    as string) || "sidebar-right"
  const articleLayout = (formData.get("articleLayout") as string) || "sidebar-right"
  const pagesLayout   = (formData.get("pagesLayout")   as string) || "content"
  const portalWidth   = (formData.get("portalWidth")   as string) || "default"
  const feedPageSize  = Number(formData.get("feedPageSize")) || 15
  const feedCardStyle = (formData.get("feedCardStyle") as string) || "preview"

  if (!VALID_LAYOUTS.has(feedLayout) || !VALID_LAYOUTS.has(articleLayout) || !VALID_LAYOUTS.has(pagesLayout))
    return fail("Invalid layout value.")
  if (!VALID_WIDTHS.has(portalWidth))
    return fail("Invalid width value.")
  if (!VALID_PAGE_SIZE.has(feedPageSize))
    return fail("Invalid page size.")
  if (!VALID_CARD_STYLES.has(feedCardStyle))
    return fail("Invalid card style.")

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", feedLayout, articleLayout, pagesLayout, portalWidth, feedPageSize, feedCardStyle },
    update: { feedLayout, articleLayout, pagesLayout, portalWidth, feedPageSize, feedCardStyle },
  })

  await logAudit({
    userId: user.id,
    action: "settings.layout",
    resourceType: "SiteSettings",
    metadata: { feedLayout, articleLayout, pagesLayout, portalWidth, feedPageSize, feedCardStyle },
  })

  revalidatePath("/", "layout")
  return ok("Layout saved.")
}

export async function toggleGravatars(enabled: boolean): Promise<ActionResult> {
  const user = await requireRole("ADMIN")

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", gravatarsEnabled: enabled },
    update: { gravatarsEnabled: enabled },
  })

  await logAudit({
    userId: user.id,
    action: "settings.gravatars",
    resourceType: "SiteSettings",
    metadata: { gravatarsEnabled: enabled },
  })

  revalidatePath("/", "layout")
  return ok(enabled ? "Gravatar enabled." : "Gravatar disabled.")
}

export async function toggleLocalAuth(enabled: boolean): Promise<ActionResult> {
  const user = await requireRole("ADMIN")

  if (!enabled) {
    const hasOtherProvider =
      Boolean(process.env.LDAP_URL || process.env.LDAP_DEV_MODE === "true") ||
      Boolean(process.env.AUTH_OKTA_ID)
    if (!hasOtherProvider) {
      return fail(
        "Cannot disable password login while no other authentication provider is configured. " +
          "Set up LDAP or Okta first.",
      )
    }
  }

  await db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", localAuthEnabled: enabled },
    update: { localAuthEnabled: enabled },
  })

  await logAudit({
    userId: user.id,
    action: "settings.localAuth",
    resourceType: "SiteSettings",
    metadata: { localAuthEnabled: enabled },
  })

  revalidatePath("/login")
  return ok(enabled ? "Password login enabled." : "Password login disabled.")
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
