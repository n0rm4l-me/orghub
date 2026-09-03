"use server"

import { db } from "@/lib/db"
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

export async function deleteMedia(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const media = await db.media.findUnique({ where: { id }, select: { key: true, url: true } })
  if (!media) return fail("Not found")
  await deleteFromStorage(media.key).catch(() => {})
  await db.$transaction([
    db.article.updateMany({ where: { coverImage: media.url }, data: { coverImage: null } }),
    db.media.delete({ where: { id } }),
  ])
  await logAudit({ userId: user.id, action: "media.delete", resourceType: "Media", resourceId: id })
  revalidatePath("/admin/media")
  return ok("Deleted")
}

export async function deleteMediaBulk(ids: string[]): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  if (!ids.length) return fail("No items selected")
  const rows = await db.media.findMany({ where: { id: { in: ids } }, select: { key: true, url: true } })
  await Promise.all(rows.map((r) => deleteFromStorage(r.key).catch(() => {})))
  const urls = rows.map((r) => r.url)
  await db.$transaction([
    db.article.updateMany({ where: { coverImage: { in: urls } }, data: { coverImage: null } }),
    db.media.deleteMany({ where: { id: { in: ids } } }),
  ])
  await logAudit({ userId: user.id, action: "media.delete", metadata: { count: ids.length } })
  revalidatePath("/admin/media")
  return ok(`Deleted ${ids.length} file${ids.length === 1 ? "" : "s"}`)
}
