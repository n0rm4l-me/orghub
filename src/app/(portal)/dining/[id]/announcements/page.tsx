import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const venue = await db.venue.findUnique({ where: { id }, select: { name: true } })
  return { title: venue ? `Announcements – ${venue.name}` : "Announcements" }
}

export default async function DiningAnnouncementsPage({ params }: Props) {
  const { id } = await params

  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("dining")) notFound()

  const venue = await db.venue.findUnique({
    where: { id },
    select: { id: true, name: true, topicsEnabled: true },
  })
  if (!venue || !venue.topicsEnabled) notFound()

  const topics = await db.monthlyTopic.findMany({
    where: { venueId: venue.id, publishedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, venueId: true, title: true, bannerImage: true, body: true, publishedAt: true, createdAt: true },
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/dining/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {venue.name}
        </Link>
      </div>

      {topics.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No announcements published yet.</p>
      ) : (
        <div className="space-y-14">
          {topics.map((topic, index) => (
            <article key={topic.id}>
              <div className={`relative mb-5 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 ${index === 0 ? "aspect-video" : "aspect-[21/9]"}`}>
                {topic.bannerImage ? (
                  <img
                    src={topic.bannerImage}
                    alt={topic.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold tracking-tight text-brand/20 select-none">
                      {topic.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-6 space-y-2">
                <h2 className={`font-semibold text-gray-900 dark:text-gray-100 ${index === 0 ? "text-2xl" : "text-lg"}`}>
                  {topic.title}
                </h2>
                {topic.body && (
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">{topic.body}</p>
                )}
              </div>

              {index < topics.length - 1 && (
                <div className="mt-14 border-t border-gray-100 dark:border-gray-700" />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
