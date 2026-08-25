import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ArticleBody } from "@/components/article-body"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PublicPagePage({ params }: Props) {
  const { slug } = await params
  const page = await db.page.findUnique({ where: { slug, published: true } })
  if (!page) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
      <div className="bg-white rounded-2xl p-8 border border-gray-100">
        <ArticleBody body={page.body as object} />
      </div>
    </div>
  )
}
