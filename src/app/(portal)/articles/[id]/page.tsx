import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArticleBody } from "@/components/article-body"
import Link from "next/link"
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params

  const article = await db.article.findFirst({
    where: { id, published: true },
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
      eventDate: true,
      eventEndDate: true,
      eventLocation: true,
      author: { select: { name: true } },
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

  const eventStart = article.eventDate ? new Date(article.eventDate) : null
  const eventEnd = article.eventEndDate ? new Date(article.eventEndDate) : null
  const sameDay = eventStart && eventEnd && eventStart.toDateString() === eventEnd.toDateString()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </Link>

        {category && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-0">
            {category.name}
          </Badge>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-8">
        <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
          {article.title}
        </h1>

        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
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

        {eventStart && (
          <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-brand/5
            border border-brand/20 px-4 py-3 text-sm text-gray-700">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-brand shrink-0" aria-hidden />
              <span className="font-medium text-brand">
                {eventStart.toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric",
                })}
              </span>
              {" · "}
              {eventStart.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              {eventEnd && sameDay && (
                <> – {eventEnd.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
              )}
              {eventEnd && !sameDay && (
                <> – {eventEnd.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                {eventEnd.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
              )}
            </span>
            {article.eventLocation && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {article.eventLocation}
              </span>
            )}
          </div>
        )}

        <ArticleBody body={article.body} />
      </div>
    </div>
  )
}
