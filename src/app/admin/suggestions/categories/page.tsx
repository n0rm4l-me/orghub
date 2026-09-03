import { requireRole } from "@/lib/rbac"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/ui/page-header"
import { SuggestionCategoryManager } from "./_manager"

export const metadata = { title: "Suggestion categories" }

export default async function SuggestionCategoriesPage() {
  await requireRole("EDITOR")

  const categories = await db.suggestionCategory.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { suggestions: true } },
    },
  })

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Categories"
        description="Labels employees pick when submitting ideas."
      />
      <SuggestionCategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          count: c._count.suggestions,
        }))}
      />
    </div>
  )
}
