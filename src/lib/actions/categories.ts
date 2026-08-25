"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { uniqueCategorySlug } from "@/lib/slug"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, fail } from "@/lib/actions/types"

const NAME_MAX = 60

function revalidateCategoryRoutes() {
  revalidatePath("/")
  revalidatePath("/admin/categories")
  revalidatePath("/admin/articles")
}

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const name = ((formData.get("name") as string) ?? "").trim()
  if (!name) return fail("Enter a category name.", "name")
  if (name.length > NAME_MAX)
    return fail(`Name must be ${NAME_MAX} characters or fewer.`, "name")

  const duplicate = await db.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  })
  if (duplicate) return fail(`"${name}" already exists.`, "name")

  const slug = await uniqueCategorySlug(name)
  const category = await db.category.create({ data: { name, slug }, select: { id: true } })

  await logAudit({
    userId: user.id,
    action: "category.create",
    resourceType: "Category",
    resourceId: category.id,
    metadata: { name },
  })

  revalidateCategoryRoutes()
  return ok(`"${name}" added.`)
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.category.findUnique({
    where: { id },
    select: { name: true, _count: { select: { articles: true } } },
  })
  if (!existing) return fail("This category no longer exists.")

  // The join table has no cascade on the category side, so its rows must go
  // first. Articles themselves are untouched: only the association is dropped.
  await db.$transaction([
    db.categoriesOnArticles.deleteMany({ where: { categoryId: id } }),
    db.category.delete({ where: { id } }),
  ])

  await logAudit({
    userId: user.id,
    action: "category.delete",
    resourceType: "Category",
    resourceId: id,
    metadata: { name: existing.name, detachedArticles: existing._count.articles },
  })

  revalidateCategoryRoutes()
  return ok(
    existing._count.articles > 0
      ? `"${existing.name}" was deleted and removed from ${existing._count.articles} article${existing._count.articles === 1 ? "" : "s"}.`
      : `"${existing.name}" was deleted.`
  )
}
