import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { requireRole } from "@/lib/rbac"
import { updateArticle } from "@/lib/actions/articles"
import { ContentForm } from "@/components/content-form"
import { EditorHeader } from "@/components/editor-header"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const article = await db.article.findUnique({ where: { id }, select: { title: true } })
  return { title: article ? `Edit: ${article.title}` : "Edit event" }
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params
  await requireRole("EDITOR")

  const [article, categories] = await Promise.all([
    db.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        excerpt: true,
        body: true,
        published: true,
        commentsEnabled: true,
        coverImage: true,
        eventDate: true,
        eventEndDate: true,
        eventLocation: true,
        categories: { select: { categoryId: true } },
      },
    }),
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ])

  if (!article || !article.eventDate) notFound()

  return (
    <div>
      <EditorHeader
        backHref="/admin/events"
        backLabel="Events"
        title={article.title}
        {...(article.published ? { liveHref: `/articles/${article.id}` } : {})}
      />
      <ContentForm
        kind="article"
        categories={categories}
        action={updateArticle.bind(null, id)}
        values={{
          id: article.id,
          title: article.title,
          excerpt: article.excerpt,
          body: article.body as object,
          published: article.published,
          commentsEnabled: article.commentsEnabled,
          coverImage: article.coverImage,
          ...(article.categories[0] ? { categoryId: article.categories[0].categoryId } : {}),
          eventDate: article.eventDate,
          eventEndDate: article.eventEndDate,
          eventLocation: article.eventLocation,
        }}
      />
    </div>
  )
}
