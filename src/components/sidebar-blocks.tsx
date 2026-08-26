import Link from "next/link"
import { Zap, ExternalLink, CalendarDays, MapPin } from "lucide-react"

interface QuickLink {
  id: string
  label: string
  url: string
}

interface Category {
  id: string
  name: string
  slug: string
}

interface UpcomingEvent {
  id: string
  title: string
  eventDate: Date | null
  eventLocation: string | null
}

interface Props {
  blocks: string[]
  eventsEnabled: boolean
  quickLinks: QuickLink[]
  categories: Category[]
  upcomingEvents: UpcomingEvent[]
  activeCategory?: string
}

export function SidebarBlocks({
  blocks,
  eventsEnabled,
  quickLinks,
  categories,
  upcomingEvents,
  activeCategory,
}: Props) {
  return (
    <>
      {blocks.map((blockId) => {
        if (blockId === "upcomingEvents" && !eventsEnabled) return null

        if (blockId === "quickLinks") {
          if (quickLinks.length === 0) return null
          return (
            <section key="quickLinks" className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Zap className="size-4 text-brand" aria-hidden />
                Quick links
              </h2>
              <ul className="space-y-0.5">
                {quickLinks.map((link) => {
                  const external = !link.url.startsWith("/")
                  return (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm
                          text-gray-600 transition hover:bg-gray-50 hover:text-brand
                          dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-brand"
                      >
                        <span className="truncate">{link.label}</span>
                        {external && (
                          <ExternalLink
                            className="ml-auto size-3 shrink-0 text-gray-300 transition
                              group-hover:text-brand"
                            aria-hidden
                          />
                        )}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        }

        if (blockId === "browseByTopic") {
          if (categories.length === 0) return null
          return (
            <section key="browseByTopic" className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Browse by topic</h2>
              <ul className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/?category=${cat.slug}`}
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium
                        transition ${
                          activeCategory === cat.slug
                            ? "bg-brand text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                        }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        }

        if (blockId === "upcomingEvents") {
          return (
            <section
              key="upcomingEvents"
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
            >
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <CalendarDays className="size-4 text-brand" aria-hidden />
                Upcoming events
              </h2>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No upcoming events.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingEvents.map((ev) => {
                    const date = new Date(ev.eventDate!)
                    return (
                      <li key={ev.id}>
                        <Link
                          href={`/articles/${ev.id}`}
                          className="group block rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <p className="text-[11px] font-semibold text-brand">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" · "}
                            {date.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs font-medium text-gray-700 transition group-hover:text-brand dark:text-gray-300">
                            {ev.title}
                          </p>
                          {ev.eventLocation && (
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                              <MapPin className="size-2.5 shrink-0" aria-hidden />
                              {ev.eventLocation}
                            </p>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
              <Link
                href="/events"
                className="mt-3 block text-center text-xs font-medium text-brand hover:underline"
              >
                View full calendar →
              </Link>
            </section>
          )
        }

        return null
      })}
    </>
  )
}
