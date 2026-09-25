"use server"

import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/rbac"
import { deleteFromStorage, listStorageObjects } from "@/lib/storage"
import { type ActionResult, ok, fail } from "@/lib/actions/types"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

const PER_PAGE = 40

export async function getMediaList(page = 1, query = "", folder?: string) {
  await requireRole("EDITOR")
  const where: Record<string, unknown> = {}
  if (query) where.filename = { contains: query, mode: "insensitive" as const }
  if (folder) where.context = folder
  const [rows, total] = await Promise.all([
    db.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, filename: true, url: true, mimeType: true,
        size: true, createdAt: true, key: true, context: true,
        uploadedBy: { select: { name: true } },
      },
    }),
    db.media.count({ where }),
  ])
  return { rows, total, perPage: PER_PAGE }
}

export type OrphanedObject = { key: string; size: number; lastModified: Date }

function collectBodyImages(node: unknown, out: Set<string>) {
  if (!node || typeof node !== "object") return
  const obj = node as Record<string, unknown>
  if (obj.type === "image") {
    const src = (obj.attrs as Record<string, unknown> | undefined)?.src
    if (typeof src === "string") out.add(src)
  }
  if (Array.isArray(obj.content)) {
    for (const child of obj.content) collectBodyImages(child, out)
  }
}

// Tiptap's image node is an atom (never has its own content children), so
// dropping it from its parent's content array is always safe: no descendant
// can be orphaned by removing one. Returns the original node unchanged
// (same reference) when nothing matched, so callers can skip a write.
function rewriteBodyImages(node: unknown, deletedUrls: Set<string>): { node: unknown; changed: boolean } {
  if (!node || typeof node !== "object" || !Array.isArray((node as Record<string, unknown>).content)) {
    return { node, changed: false }
  }
  const obj = node as Record<string, unknown>
  let changed = false
  const content: unknown[] = []
  for (const child of obj.content as unknown[]) {
    const c = child as Record<string, unknown> | null
    const src = c && typeof c === "object" ? (c.attrs as Record<string, unknown> | undefined)?.src : undefined
    if (c?.type === "image" && typeof src === "string" && deletedUrls.has(src)) {
      changed = true
      continue
    }
    const result = rewriteBodyImages(child, deletedUrls)
    if (result.changed) changed = true
    content.push(result.node)
  }
  return changed ? { node: { ...obj, content }, changed: true } : { node, changed: false }
}

export async function findOrphanedObjects(): Promise<OrphanedObject[]> {
  await requireRole("ADMIN")

  const [allObjects, articleRows, pageRows, siteSettings, dishes, fixedEntries, weekEntries, topics, highlights, users] = await Promise.all([
    listStorageObjects(),
    db.article.findMany({ select: { coverImage: true, body: true } }),
    db.page.findMany({ select: { body: true } }),
    db.siteSettings.findFirst({ select: { logoUrl: true, logoOnLightUrl: true } }),
    db.dish.findMany({ select: { photo: true } }),
    db.fixedMenuEntry.findMany({ select: { photo: true } }),
    db.weekMenuEntry.findMany({ select: { photo: true } }),
    db.monthlyTopic.findMany({ select: { bannerImage: true } }),
    db.monthlyTopicHighlight.findMany({ select: { image: true } }),
    db.user.findMany({ select: { avatarUrl: true } }),
  ])

  const referenced = new Set<string>()
  function addUrl(url: string | null | undefined) {
    if (!url) return
    if (url.startsWith("/uploads/")) referenced.add(url.slice("/uploads/".length))
  }

  for (const r of articleRows) {
    addUrl(r.coverImage)
    const bodyUrls = new Set<string>()
    collectBodyImages(r.body, bodyUrls)
    for (const u of bodyUrls) addUrl(u)
  }
  for (const r of pageRows) {
    const bodyUrls = new Set<string>()
    collectBodyImages(r.body, bodyUrls)
    for (const u of bodyUrls) addUrl(u)
  }
  if (siteSettings) { addUrl(siteSettings.logoUrl); addUrl(siteSettings.logoOnLightUrl) }
  for (const r of dishes) addUrl(r.photo)
  for (const r of fixedEntries) addUrl(r.photo)
  for (const r of weekEntries) addUrl(r.photo)
  for (const r of topics) addUrl(r.bannerImage)
  for (const r of highlights) addUrl(r.image)
  for (const r of users) addUrl(r.avatarUrl)

  return allObjects.filter((o) => !o.key.startsWith("_derived/") && !referenced.has(o.key))
}

export async function deleteOrphanedObjects(keys: string[]): Promise<ActionResult> {
  const user = await requireRole("ADMIN")
  if (!keys.length) return fail("No keys provided")
  await Promise.all([
    ...keys.map((k) => deleteFromStorage(k).catch(() => {})),
    db.media.deleteMany({ where: { key: { in: keys } } }),
  ])
  await logAudit({ userId: user.id, action: "media.delete", metadata: { count: keys.length, orphaned: true } })
  revalidatePath("/admin/media")
  return ok(`Deleted ${keys.length} orphaned object${keys.length === 1 ? "" : "s"}`)
}

export async function deleteMediaBulk(ids: string[]): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  if (!ids.length) return fail("No items selected")
  const rows = await db.media.findMany({ where: { id: { in: ids } }, select: { key: true, url: true } })
  await Promise.all(rows.map((r) => deleteFromStorage(r.key).catch(() => {})))
  const urls = rows.map((r) => r.url)
  const urlSet = new Set(urls)

  // Article/Page body content can also embed these URLs as Tiptap image
  // nodes; find which rows actually reference one before writing anything.
  // Same full-table-scan tradeoff findOrphanedObjects already makes below
  // for the same reason: no raw SQL in this codebase to query inside a Json
  // column, and this only runs on an admin's explicit bulk-delete click.
  const [articleRows, pageRows] = await Promise.all([
    db.article.findMany({ select: { id: true, body: true } }),
    db.page.findMany({ select: { id: true, body: true } }),
  ])
  const articleUpdates = articleRows
    .map((r) => ({ id: r.id, ...rewriteBodyImages(r.body, urlSet) }))
    .filter((r) => r.changed)
  const pageUpdates = pageRows
    .map((r) => ({ id: r.id, ...rewriteBodyImages(r.body, urlSet) }))
    .filter((r) => r.changed)

  // Clear every simple (non-rich-text) field that can point at one of these
  // URLs, plus the rich-text body rows just found above, so a deleted file
  // doesn't leave a permanently broken image behind anywhere.
  await db.$transaction([
    db.article.updateMany({ where: { coverImage: { in: urls } }, data: { coverImage: null } }),
    db.dish.updateMany({ where: { photo: { in: urls } }, data: { photo: null } }),
    db.fixedMenuEntry.updateMany({ where: { photo: { in: urls } }, data: { photo: null } }),
    db.weekMenuEntry.updateMany({ where: { photo: { in: urls } }, data: { photo: null } }),
    db.monthlyTopic.updateMany({ where: { bannerImage: { in: urls } }, data: { bannerImage: null } }),
    db.monthlyTopicHighlight.updateMany({ where: { image: { in: urls } }, data: { image: null } }),
    db.user.updateMany({ where: { avatarUrl: { in: urls } }, data: { avatarUrl: null } }),
    db.siteSettings.updateMany({ where: { logoUrl: { in: urls } }, data: { logoUrl: null } }),
    db.siteSettings.updateMany({ where: { logoOnLightUrl: { in: urls } }, data: { logoOnLightUrl: null } }),
    ...articleUpdates.map((r) =>
      db.article.update({ where: { id: r.id }, data: { body: r.node as Prisma.InputJsonValue } }),
    ),
    ...pageUpdates.map((r) =>
      db.page.update({ where: { id: r.id }, data: { body: r.node as Prisma.InputJsonValue } }),
    ),
    db.media.deleteMany({ where: { id: { in: ids } } }),
  ])
  await logAudit({ userId: user.id, action: "media.delete", metadata: { count: ids.length } })
  revalidatePath("/admin/media")
  return ok(`Deleted ${ids.length} file${ids.length === 1 ? "" : "s"}`)
}
