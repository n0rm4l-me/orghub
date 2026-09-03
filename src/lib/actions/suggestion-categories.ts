"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, fail } from "@/lib/actions/types"

function revalidate() {
  revalidatePath("/suggestions")
  revalidatePath("/admin/suggestions")
  revalidatePath("/admin/suggestions/categories")
}

export async function createSuggestionCategory(formData: FormData): Promise<ActionResult> {
  await requireRole("EDITOR")

  const name = ((formData.get("name") as string) ?? "").trim()
  if (!name || name.length > 60) return fail("Name must be 1–60 characters.")

  const existing = await db.suggestionCategory.findUnique({ where: { name } })
  if (existing) return fail(`"${name}" already exists.`)

  await db.suggestionCategory.create({ data: { name } })
  revalidate()
  return ok(`"${name}" added.`)
}

export async function deleteSuggestionCategory(id: string): Promise<ActionResult> {
  await requireRole("EDITOR")

  const cat = await db.suggestionCategory.findUnique({
    where: { id },
    select: { name: true, _count: { select: { suggestions: true } } },
  })
  if (!cat) return fail("Not found.")

  await db.suggestionCategory.delete({ where: { id } })
  revalidate()

  return ok(
    cat._count.suggestions > 0
      ? `"${cat.name}" deleted. ${cat._count.suggestions} suggestion${cat._count.suggestions === 1 ? "" : "s"} lost this category.`
      : `"${cat.name}" deleted.`
  )
}
