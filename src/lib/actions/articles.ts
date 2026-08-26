"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { uniqueArticleSlug } from "@/lib/slug"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"

const TITLE_MAX = 200
const EXCERPT_MAX = 300

const LOCATION_MAX = 200

interface ParsedInput {
  title: string
  excerpt: string | null
  body: object
  categoryId: string | null
  published: boolean
  commentsEnabled: boolean
  eventDate: Date | null
  eventEndDate: Date | null
  eventLocation: string | null
  coverImage: string | null
}

/** Validates and normalizes the editor payload. */
function parse(formData: FormData): ParsedInput | { error: string; field: string } {
  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return { error: "Title is required.", field: "title" }
  if (title.length > TITLE_MAX)
    return { error: `Title must be ${TITLE_MAX} characters or fewer.`, field: "title" }

  const excerptRaw = ((formData.get("excerpt") as string) ?? "").trim()
  if (excerptRaw.length > EXCERPT_MAX)
    return { error: `Summary must be ${EXCERPT_MAX} characters or fewer.`, field: "excerpt" }

  let body: object
  try {
    body = JSON.parse((formData.get("body") as string) || '{"type":"doc","content":[]}')
  } catch {
    return { error: "The editor content could not be saved. Please retry.", field: "body" }
  }

  const categoryId = ((formData.get("categoryId") as string) ?? "").trim()

  const eventDateRaw = ((formData.get("eventDate") as string) ?? "").trim()
  const eventEndDateRaw = ((formData.get("eventEndDate") as string) ?? "").trim()
  const eventLocationRaw = ((formData.get("eventLocation") as string) ?? "").trim()
  const coverImageRaw = ((formData.get("coverImage") as string) ?? "").trim()

  const eventDate = eventDateRaw ? new Date(eventDateRaw) : null
  const eventEndDate = eventEndDateRaw ? new Date(eventEndDateRaw) : null

  if (eventDate && isNaN(eventDate.getTime()))
    return { error: "Invalid event date.", field: "eventDate" }
  if (eventEndDate && isNaN(eventEndDate.getTime()))
    return { error: "Invalid end date.", field: "eventEndDate" }
  if (eventDate && eventEndDate && eventEndDate <= eventDate)
    return { error: "End date must be after start date.", field: "eventEndDate" }
  if (eventLocationRaw.length > LOCATION_MAX)
    return { error: `Location must be ${LOCATION_MAX} characters or fewer.`, field: "eventLocation" }

  return {
    title,
    excerpt: excerptRaw || null,
    body,
    categoryId: categoryId || null,
    published: formData.get("published") === "true",
    commentsEnabled: formData.get("commentsEnabled") !== "false",
    eventDate,
    eventEndDate,
    eventLocation: eventLocationRaw || null,
    coverImage: coverImageRaw || null,
  }
}

function revalidateArticle(slug?: string) {
  revalidatePath("/")
  revalidatePath("/admin/articles")
  revalidatePath("/admin")
  if (slug) revalidatePath(`/articles/${slug}`)
}

export async function createArticle(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")

  const parsed = parse(formData)
  if ("error" in parsed) return fail(parsed.error, parsed.field)

  const slug = await uniqueArticleSlug(parsed.title)

  const article = await db.article.create({
    data: {
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt,
      body: parsed.body,
      published: parsed.published,
      publishedAt: parsed.published ? new Date() : null,
      commentsEnabled: parsed.commentsEnabled,
      eventDate: parsed.eventDate,
      eventEndDate: parsed.eventEndDate,
      eventLocation: parsed.eventLocation,
      coverImage: parsed.coverImage,
      authorId: user.id,
      categories: parsed.categoryId ? { create: { categoryId: parsed.categoryId } } : undefined,
    },
    select: { id: true, slug: true },
  })

  await logAudit({
    userId: user.id,
    action: "article.create",
    resourceType: "Article",
    resourceId: article.id,
    metadata: { title: parsed.title, published: parsed.published },
  })

  revalidateArticle(article.slug)
  return okWith(
    { id: article.id },
    parsed.published ? "Article published." : "Draft saved."
  )
}

export async function updateArticle(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")

  const parsed = parse(formData)
  if ("error" in parsed) return fail(parsed.error, parsed.field)

  const existing = await db.article.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, published: true, publishedAt: true },
  })
  if (!existing) return fail("This article no longer exists.")

  // Re-slug only when the title changed, so existing links stay valid.
  const slug =
    existing.title === parsed.title
      ? existing.slug
      : await uniqueArticleSlug(parsed.title, id)

  await db.article.update({
    where: { id },
    data: {
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt,
      body: parsed.body,
      published: parsed.published,
      // Preserve the original publish timestamp across edits.
      publishedAt: parsed.published ? (existing.publishedAt ?? new Date()) : null,
      commentsEnabled: parsed.commentsEnabled,
      eventDate: parsed.eventDate,
      eventEndDate: parsed.eventEndDate,
      eventLocation: parsed.eventLocation,
      coverImage: parsed.coverImage,
      categories: {
        deleteMany: {},
        ...(parsed.categoryId ? { create: { categoryId: parsed.categoryId } } : {}),
      },
    },
  })

  await logAudit({
    userId: user.id,
    action: "article.update",
    resourceType: "Article",
    resourceId: id,
    metadata: { title: parsed.title, slugChanged: slug !== existing.slug },
  })

  revalidateArticle(slug)
  if (existing.slug !== slug) revalidatePath(`/articles/${existing.slug}`)
  return okWith({ id }, "Changes saved.")
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.article.findUnique({
    where: { id },
    select: { slug: true, title: true },
  })
  if (!existing) return fail("This article no longer exists.")

  await db.article.delete({ where: { id } })

  await logAudit({
    userId: user.id,
    action: "article.delete",
    resourceType: "Article",
    resourceId: id,
    metadata: { title: existing.title },
  })

  revalidateArticle(existing.slug)
  return ok(`"${existing.title}" was deleted.`)
}

export async function pinArticle(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.article.findUnique({
    where: { id },
    select: { title: true, published: true, pinned: true },
  })
  if (!existing) return fail("This article no longer exists.")
  if (!existing.published) return fail("Only published articles can be pinned.")

  const pinning = !existing.pinned
  await db.article.update({ where: { id }, data: { pinned: pinning } })

  await logAudit({
    userId: user.id,
    action: pinning ? "article.pin" : "article.unpin",
    resourceType: "Article",
    resourceId: id,
    metadata: { title: existing.title },
  })

  revalidatePath("/")
  revalidatePath("/admin/articles")
  return ok(pinning ? `"${existing.title}" pinned to the feed.` : `"${existing.title}" unpinned.`)
}

export async function markImportant(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.article.findUnique({
    where: { id },
    select: { title: true, important: true },
  })
  if (!existing) return fail("This article no longer exists.")

  const marking = !existing.important
  await db.article.update({ where: { id }, data: { important: marking } })

  await logAudit({
    userId: user.id,
    action: marking ? "article.mark_important" : "article.unmark_important",
    resourceType: "Article",
    resourceId: id,
    metadata: { title: existing.title },
  })

  revalidatePath("/")
  revalidatePath("/admin/articles")
  return ok(marking ? `"${existing.title}" marked as important.` : `"${existing.title}" unmarked.`)
}

export async function togglePublish(
  id: string,
  currentlyPublished: boolean
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.article.findUnique({
    where: { id },
    select: { slug: true, title: true, publishedAt: true },
  })
  if (!existing) return fail("This article no longer exists.")

  const published = !currentlyPublished

  await db.article.update({
    where: { id },
    data: {
      published,
      publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
    },
  })

  await logAudit({
    userId: user.id,
    action: published ? "article.publish" : "article.unpublish",
    resourceType: "Article",
    resourceId: id,
    metadata: { title: existing.title },
  })

  revalidateArticle(existing.slug)
  return ok(published ? "Article is now live." : "Article moved to drafts.")
}
