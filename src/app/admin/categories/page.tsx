import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { CategoryManager } from "@/components/category-manager"

export const metadata = { title: "Categories" }

export default async function CategoriesPage() {
  await requireRole("EDITOR")

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { articles: true } },
    },
  })

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Categories"
        description={`${categories.length} topic${categories.length === 1 ? "" : "s"}`}
      />
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          articleCount: c._count.articles,
        }))}
      />
    </div>
  )
}
