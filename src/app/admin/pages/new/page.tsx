import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { createPage } from "@/lib/actions/pages"
import { ContentForm } from "@/components/content-form"
import { EditorHeader } from "@/components/editor-header"

export const metadata = { title: "New page" }

export default async function NewPagePage() {
  await requireRole("EDITOR")

  const parentCandidates = await db.page.findMany({
    where: { parentId: null },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  })

  return (
    <div>
      <EditorHeader backHref="/admin/pages" backLabel="Pages" title="New page" />
      <ContentForm
        kind="page"
        action={createPage}
        parentPages={parentCandidates}
        redirectAfterCreate="/admin/pages/{id}/edit"
      />
    </div>
  )
}
