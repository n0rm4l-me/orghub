import { db } from "@/lib/db"

// Combining diacritical marks, stripped after NFKD so "Café" yields "cafe".
const COMBINING_MARKS = /[̀-ͯ]/g

export function slugify(str: string): string {
  return (
    str
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      .replace(COMBINING_MARKS, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70) || "untitled"
  )
}

/**
 * Produces a readable slug, appending `-2`, `-3`, … only when the base is taken.
 * `excludeId` lets a record keep its own slug while being updated.
 */
async function unique(
  base: string,
  taken: (slug: string) => Promise<boolean>
): Promise<string> {
  if (!(await taken(base))) return base
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}-${n}`
    if (!(await taken(candidate))) return candidate
  }
  // Pathological collision count: fall back to a suffix that cannot clash.
  return `${base}-${Math.floor(Date.now() / 1000).toString(36)}`
}

export function uniqueArticleSlug(title: string, excludeId?: string) {
  return unique(slugify(title), async (slug) => {
    const hit = await db.article.findUnique({ where: { slug }, select: { id: true } })
    return !!hit && hit.id !== excludeId
  })
}

export function uniquePageSlug(title: string, excludeId?: string) {
  return unique(slugify(title), async (slug) => {
    const hit = await db.page.findUnique({ where: { slug }, select: { id: true } })
    return !!hit && hit.id !== excludeId
  })
}

export function uniqueCategorySlug(name: string, excludeId?: string) {
  return unique(slugify(name), async (slug) => {
    const hit = await db.category.findUnique({ where: { slug }, select: { id: true } })
    return !!hit && hit.id !== excludeId
  })
}
