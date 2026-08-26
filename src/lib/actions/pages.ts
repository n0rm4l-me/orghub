"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { uniquePageSlug } from "@/lib/slug"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"

const TITLE_MAX = 200

interface ParsedInput {
  title: string
  body: object
  published: boolean
  parentId: string | null
}

function parse(formData: FormData): ParsedInput | { error: string; field: string } {
  const title = ((formData.get("title") as string) ?? "").trim()
  if (!title) return { error: "Title is required.", field: "title" }
  if (title.length > TITLE_MAX)
    return { error: `Title must be ${TITLE_MAX} characters or fewer.`, field: "title" }

  let body: object
  try {
    body = JSON.parse((formData.get("body") as string) || '{"type":"doc","content":[]}')
  } catch {
    return { error: "The editor content could not be saved. Please retry.", field: "body" }
  }

  const parentId = (formData.get("parentId") as string | null) || null

  return { title, body, published: formData.get("published") === "true", parentId }
}

/** Pages appear in the site navigation, so the header on every route must refresh. */
function revalidatePageRoutes(slug?: string) {
  revalidatePath("/", "layout")
  revalidatePath("/admin/pages")
  if (slug) revalidatePath(`/pages/${slug}`)
}

export async function createPage(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")

  const parsed = parse(formData)
  if ("error" in parsed) return fail(parsed.error, parsed.field)

  const slug = await uniquePageSlug(parsed.title)

  const page = await db.page.create({
    data: {
      title: parsed.title,
      slug,
      body: parsed.body,
      published: parsed.published,
      parentId: parsed.parentId,
    },
    select: { id: true, slug: true },
  })

  await logAudit({
    userId: user.id,
    action: "page.create",
    resourceType: "Page",
    resourceId: page.id,
    metadata: { title: parsed.title, published: parsed.published },
  })

  revalidatePageRoutes(page.slug)
  return okWith(
    { id: page.id },
    parsed.published ? "Page published." : "Draft saved."
  )
}

export async function updatePage(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")

  const parsed = parse(formData)
  if ("error" in parsed) return fail(parsed.error, parsed.field)

  const existing = await db.page.findUnique({
    where: { id },
    select: { slug: true, title: true },
  })
  if (!existing) return fail("This page no longer exists.")

  const slug =
    existing.title === parsed.title ? existing.slug : await uniquePageSlug(parsed.title, id)

  await db.page.update({
    where: { id },
    data: {
      title: parsed.title,
      slug,
      body: parsed.body,
      published: parsed.published,
      parentId: parsed.parentId,
    },
  })

  await logAudit({
    userId: user.id,
    action: "page.update",
    resourceType: "Page",
    resourceId: id,
    metadata: { title: parsed.title, slugChanged: slug !== existing.slug },
  })

  revalidatePageRoutes(slug)
  if (existing.slug !== slug) revalidatePath(`/pages/${existing.slug}`)
  return okWith({ id }, "Changes saved.")
}

export async function deletePage(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.page.findUnique({
    where: { id },
    select: { slug: true, title: true },
  })
  if (!existing) return fail("This page no longer exists.")

  await db.page.delete({ where: { id } })

  await logAudit({
    userId: user.id,
    action: "page.delete",
    resourceType: "Page",
    resourceId: id,
    metadata: { title: existing.title },
  })

  revalidatePageRoutes(existing.slug)
  return ok(`"${existing.title}" was deleted.`)
}

export async function togglePagePublish(
  id: string,
  currentlyPublished: boolean
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.page.findUnique({
    where: { id },
    select: { slug: true, title: true },
  })
  if (!existing) return fail("This page no longer exists.")

  const published = !currentlyPublished
  await db.page.update({ where: { id }, data: { published } })

  await logAudit({
    userId: user.id,
    action: published ? "page.publish" : "page.unpublish",
    resourceType: "Page",
    resourceId: id,
    metadata: { title: existing.title },
  })

  revalidatePageRoutes(existing.slug)
  return ok(published ? "Page is now live." : "Page moved to drafts.")
}
