import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { createArticle } from "@/lib/actions/articles"
import { ContentForm } from "@/components/content-form"
import { EditorHeader } from "@/components/editor-header"

export const metadata = { title: "New article" }

export default async function NewArticlePage() {
  await requireRole("EDITOR")
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })

  return (
    <div>
      <EditorHeader backHref="/admin/articles" backLabel="Articles" title="New article" />
      <ContentForm
        kind="article"
        categories={categories}
        action={createArticle}
        redirectAfterCreate="/admin/articles/{id}/edit"
      />
    </div>
  )
}
