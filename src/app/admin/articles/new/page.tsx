import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { createArticle } from "@/lib/actions/articles"
import { ContentForm } from "@/components/content-form"
import { EditorHeader } from "@/components/editor-header"

interface Props {
  searchParams: Promise<{ kind?: string }>
}

export default async function NewArticlePage({ searchParams }: Props) {
  await requireRole("EDITOR")
  const { kind } = await searchParams
  const isEvent = kind === "event"

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  })

  return (
    <div>
      <EditorHeader
        backHref={isEvent ? "/admin/events" : "/admin/articles"}
        backLabel={isEvent ? "Events" : "Articles"}
        title={isEvent ? "New event" : "New article"}
      />
      <ContentForm
        kind="article"
        categories={categories}
        action={createArticle}
        redirectAfterCreate={isEvent ? "/admin/events/{id}/edit" : "/admin/articles/{id}/edit"}
      />
    </div>
  )
}
