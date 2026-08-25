import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArticleBody } from "@/components/article-body"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params

  const article = await db.article.findFirst({
    where: { id, published: true },
    include: {
      author: true,
      categories: { include: { category: true } },
    },
  })

  if (!article) notFound()

  const category = article.categories[0]?.category
  const initials = article.author.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      {category && (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0 mb-3">
          {category.name}
        </Badge>
      )}

      <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
        {article.title}
      </h1>

      <div className="flex items-center gap-3 mb-8 pb-8 border-b border-gray-100">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-gray-900">{article.author.name}</p>
          <p className="text-xs text-gray-500">
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Draft"}
          </p>
        </div>
      </div>

      <ArticleBody body={article.body} />
    </div>
  )
}
