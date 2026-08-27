import Link from "next/link"
import { Zap, ExternalLink, CalendarDays, MapPin, Tag, Award } from "lucide-react"
import { PollCard } from "@/components/poll-card"
import type { PollCardPoll, PollOption } from "@/components/poll-card"
import { gravatarUrl } from "@/lib/gravatar"

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

export interface TopKudosEntry {
  userId: string
  name: string | null
  email: string
  avatarUrl: string | null
  total: number
}

export interface ActivePollData {
  poll: PollCardPoll
  options: PollOption[]
  totalVotes: number
  votedOptionIds: string[]
}

interface Props {
  blocks: string[]
  eventsEnabled: boolean
  kudosEnabled?: boolean
  quickLinks: QuickLink[]
  categories: Category[]
  upcomingEvents: UpcomingEvent[]
  activeCategory?: string
  activePoll?: ActivePollData | null
  topKudos?: TopKudosEntry[]
  gravatarsEnabled?: boolean
}

export function SidebarBlocks({
  blocks,
  eventsEnabled,
  kudosEnabled,
  quickLinks,
  categories,
  upcomingEvents,
  activeCategory,
  activePoll,
  topKudos,
  gravatarsEnabled = true,
}: Props) {
  return (
    <>
      {blocks.map((blockId) => {
        if (blockId === "upcomingEvents" && !eventsEnabled) return null
        if (blockId === "topKudos" && !kudosEnabled) return null

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
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Tag className="size-4 text-brand" aria-hidden />
                Browse by topic
              </h2>
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

        if (blockId === "activePolls") {
          if (!activePoll) return null
          return (
            <PollCard
              key="activePolls"
              poll={activePoll.poll}
              options={activePoll.options}
              totalVotes={activePoll.totalVotes}
              initialVotedOptionIds={activePoll.votedOptionIds}
              compact
            />
          )
        }

        if (blockId === "topKudos") {
          if (!topKudos || topKudos.length === 0) return null
          return (
            <section key="topKudos" className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Award className="size-4 text-brand" aria-hidden />
                Top kudos this month
              </h2>
              <ul className="space-y-2">
                {topKudos.map((entry, i) => {
                  const initials = (entry.name ?? entry.email)
                    .split(/[\s@.]+/).filter(Boolean)
                    .map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?"
                  const avatar = gravatarsEnabled ? gravatarUrl(entry.email, 32) : null
                  return (
                    <li key={entry.userId} className="flex items-center gap-2.5">
                      <span className="w-4 shrink-0 text-[11px] font-semibold text-gray-400">{i + 1}</span>
                      {avatar ? (
                        <img src={avatar} alt="" className="size-7 shrink-0 rounded-full bg-gray-100" />
                      ) : (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                          {initials}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                        {entry.name ?? entry.email.split("@")[0]}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-brand">{entry.total}</span>
                    </li>
                  )
                })}
              </ul>
              <Link
                href="/kudos"
                className="mt-3 block text-center text-xs font-medium text-brand hover:underline"
              >
                View kudos wall →
              </Link>
            </section>
          )
        }

        return null
      })}
    </>
  )
}
