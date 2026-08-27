import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { createArticle } from "@/lib/actions/articles"
import { ContentForm } from "@/components/content-form"
import { EditorHeader } from "@/components/editor-header"

export const metadata = { title: "New event" }

export default async function NewEventPage() {
  await requireRole("EDITOR")

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })

  return (
    <div>
      <EditorHeader backHref="/admin/events" backLabel="Events" title="New event" />
      <ContentForm
        kind="article"
        categories={categories}
        action={createArticle}
        redirectAfterCreate="/admin/events/{id}/edit"
      />
    </div>
  )
}
