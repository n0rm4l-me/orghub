"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { deleteFromStorage } from "@/lib/storage"
import { type ActionResult, ok, fail } from "@/lib/actions/types"
import { revalidatePath } from "next/cache"

const PER_PAGE = 40

export async function getMediaList(page = 1, query = "") {
  await requireRole("EDITOR")
  const where = query
    ? { filename: { contains: query, mode: "insensitive" as const } }
    : {}
  const [rows, total] = await Promise.all([
    db.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, filename: true, url: true, mimeType: true,
        size: true, createdAt: true, key: true,
        uploadedBy: { select: { name: true } },
      },
    }),
    db.media.count({ where }),
  ])
  return { rows, total, perPage: PER_PAGE }
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  await requireRole("EDITOR")
  const media = await db.media.findUnique({ where: { id }, select: { key: true, url: true } })
  if (!media) return fail("Not found")
  await deleteFromStorage(media.key).catch(() => {})
  await db.$transaction([
    db.article.updateMany({ where: { coverImage: media.url }, data: { coverImage: null } }),
    db.media.delete({ where: { id } }),
  ])
  revalidatePath("/admin/media")
  return ok("Deleted")
}

export async function deleteMediaBulk(ids: string[]): Promise<ActionResult> {
  await requireRole("EDITOR")
  if (!ids.length) return fail("No items selected")
  const rows = await db.media.findMany({ where: { id: { in: ids } }, select: { key: true, url: true } })
  await Promise.all(rows.map((r) => deleteFromStorage(r.key).catch(() => {})))
  const urls = rows.map((r) => r.url)
  await db.$transaction([
    db.article.updateMany({ where: { coverImage: { in: urls } }, data: { coverImage: null } }),
    db.media.deleteMany({ where: { id: { in: ids } } }),
  ])
  revalidatePath("/admin/media")
  return ok(`Deleted ${ids.length} file${ids.length === 1 ? "" : "s"}`)
}
