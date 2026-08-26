"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, fail } from "@/lib/actions/types"

/** Nav changes affect the header, which renders inside the root layout. */
function revalidateNav() {
  revalidatePath("/", "layout")
  revalidatePath("/admin/navigation")
}

export async function setPageInNav(pageId: string, showInNav: boolean): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const page = await db.page.findUnique({
    where: { id: pageId },
    select: { title: true, published: true },
  })
  if (!page) return fail("This page no longer exists.")

  await db.page.update({ where: { id: pageId }, data: { showInNav } })

  await logAudit({
    userId: user.id,
    action: "nav.update",
    resourceType: "Page",
    resourceId: pageId,
    metadata: { title: page.title, showInNav },
  })

  revalidateNav()
  if (showInNav && !page.published)
    return ok(`"${page.title}" will appear in the menu once it is published.`)
  return ok(showInNav ? `"${page.title}" added to the menu.` : `"${page.title}" removed from the menu.`)
}

/**
 * Swaps a page with its neighbour.
 *
 * Ordering is stored as an integer rather than a linked list, and the two writes
 * run in one transaction so an interrupted request cannot leave both pages
 * claiming the same slot.
 */
export async function movePage(pageId: string, direction: "up" | "down"): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const page = await db.page.findUnique({
    where: { id: pageId },
    select: { title: true, parentId: true },
  })
  if (!page) return fail("This page no longer exists.")

  // Scope reordering to siblings (same parentId) so children can't escape their parent group.
  const siblings = await db.page.findMany({
    where: { parentId: page.parentId },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: { id: true, title: true },
  })

  const index = siblings.findIndex((p) => p.id === pageId)
  if (index === -1) return fail("This page no longer exists.")

  const target = direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= siblings.length) return ok()

  const reordered = [...siblings]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(target, 0, moved!)

  await db.$transaction(
    reordered.map((p, i) => db.page.update({ where: { id: p.id }, data: { order: i } }))
  )

  await logAudit({
    userId: user.id,
    action: "nav.update",
    resourceType: "Page",
    resourceId: pageId,
    metadata: { title: page.title, direction },
  })

  revalidateNav()
  return ok()
}

function validUrl(raw: string): boolean {
  // Site-relative paths are allowed so links can point at internal routes.
  if (raw.startsWith("/")) return true
  try {
    const url = new URL(raw)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export async function createQuickLink(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const label = ((formData.get("label") as string) ?? "").trim()
  const url = ((formData.get("url") as string) ?? "").trim()

  if (!label) return fail("Enter a label.", "label")
  if (label.length > 40) return fail("Label must be 40 characters or fewer.", "label")
  if (!url) return fail("Enter a destination.", "url")
  if (!validUrl(url)) return fail("Use https://example.com or /internal-path", "url")

  const last = await db.quickLink.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  })

  const link = await db.quickLink.create({
    data: { label, url, order: (last?.order ?? -1) + 1 },
    select: { id: true },
  })

  await logAudit({
    userId: user.id,
    action: "link.create",
    resourceType: "QuickLink",
    resourceId: link.id,
    metadata: { label, url },
  })

  revalidateNav()
  return ok(`"${label}" added.`)
}

export async function deleteQuickLink(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const link = await db.quickLink.findUnique({ where: { id }, select: { label: true } })
  if (!link) return fail("This link no longer exists.")

  await db.quickLink.delete({ where: { id } })

  await logAudit({
    userId: user.id,
    action: "link.delete",
    resourceType: "QuickLink",
    resourceId: id,
    metadata: { label: link.label },
  })

  revalidateNav()
  return ok(`"${link.label}" was removed.`)
}

export async function moveQuickLink(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const links = await db.quickLink.findMany({
    orderBy: [{ order: "asc" }, { label: "asc" }],
    select: { id: true, label: true },
  })

  const index = links.findIndex((l) => l.id === id)
  if (index === -1) return fail("This link no longer exists.")

  const target = direction === "up" ? index - 1 : index + 1
  if (target < 0 || target >= links.length) return ok()

  const reordered = [...links]
  const [moved] = reordered.splice(index, 1)
  reordered.splice(target, 0, moved!)

  await db.$transaction(
    reordered.map((link, i) => db.quickLink.update({ where: { id: link.id }, data: { order: i } }))
  )

  await logAudit({
    userId: user.id,
    action: "link.update",
    resourceType: "QuickLink",
    resourceId: id,
    metadata: { label: links[index]!.label, direction },
  })

  revalidateNav()
  return ok()
}
