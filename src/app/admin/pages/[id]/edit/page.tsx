import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { requireRole } from "@/lib/rbac"
import { updatePage } from "@/lib/actions/pages"
import { ContentForm } from "@/components/content-form"
import { EditorHeader } from "@/components/editor-header"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const page = await db.page.findUnique({ where: { id }, select: { title: true } })
  return { title: page ? `Edit: ${page.title}` : "Edit page" }
}

export default async function EditPagePage({ params }: Props) {
  const { id } = await params
  await requireRole("EDITOR")

  const page = await db.page.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true, body: true, published: true },
  })
  if (!page) notFound()

  return (
    <div>
      <EditorHeader
        backHref="/admin/pages"
        backLabel="Pages"
        title={page.title}
        {...(page.published ? { liveHref: `/pages/${page.slug}` } : {})}
      />
      <ContentForm
        kind="page"
        action={updatePage.bind(null, id)}
        values={{
          id: page.id,
          title: page.title,
          body: page.body as object,
          published: page.published,
        }}
      />
    </div>
  )
}
