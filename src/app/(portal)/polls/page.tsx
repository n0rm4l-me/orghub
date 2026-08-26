import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getCurrentUser } from "@/lib/rbac"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { PollCard } from "@/components/poll-card"
import { SidebarBlocks } from "@/components/sidebar-blocks"
import { EmptyState } from "@/components/ui/empty-state"
import { BarChart2 } from "lucide-react"

export const metadata = { title: "Polls" }

export default async function PollsPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()])
  if (!parseModules(settings.enabledModules).has("polls")) notFound()

  const enabled = parseModules(settings.enabledModules)
  const eventsEnabled = enabled.has("events")
  const articleLayout = settings.articleLayout ?? "sidebar-right"
  const rightBlocks = settings.sidebarOrder?.split(",").filter(Boolean) ?? ["quickLinks", "browseByTopic", "upcomingEvents"]
  const leftBlocks = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const showLeft = articleLayout === "sidebar-left" || articleLayout === "sidebar-both"
  const showRight = articleLayout === "sidebar-right" || articleLayout === "sidebar-both"

  const now = new Date()
  const [polls, quickLinks, upcomingEvents, categories] = await Promise.all([
    db.poll.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        options: {
          orderBy: { order: "asc" },
          include: { _count: { select: { votes: true } } },
        },
        _count: { select: { votes: true } },
      },
    }),
    getQuickLinks(),
    getUpcomingEvents(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ])

  const votedMap: Record<string, string[]> = {}
  if (user) {
    const userVotes = await db.pollVote.findMany({
      where: { userId: user.id, pollId: { in: polls.map((p) => p.id) } },
      select: { pollId: true, optionId: true },
    })
    for (const v of userVotes) {
      if (!votedMap[v.pollId]) votedMap[v.pollId] = []
      votedMap[v.pollId]!.push(v.optionId)
    }
  }

  const content = (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Polls</h1>

      {polls.length === 0 ? (
        <EmptyState
          icon={BarChart2}
          title="No active polls"
          description="There are no open polls right now. Check back later."
        />
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const isExpired = poll.endsAt !== null && poll.endsAt < now
            return (
              <PollCard
                key={poll.id}
                poll={{
                  id: poll.id,
                  question: poll.question,
                  anonymous: poll.anonymous,
                  multiChoice: poll.multiChoice,
                  resultsVisibility: poll.resultsVisibility,
                  status: isExpired ? "CLOSED" : poll.status,
                  endsAt: poll.endsAt,
                }}
                options={poll.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes }))}
                totalVotes={poll._count.votes}
                initialVotedOptionIds={user ? (votedMap[poll.id] ?? []) : []}
              />
            )
          })}
        </div>
      )}
    </div>
  )

  if (!showLeft && !showRight) {
    return <div className="mx-auto max-w-2xl">{content}</div>
  }

  return (
    <div className="flex items-start gap-8">
      {showLeft && (
        <aside className="sticky top-20 hidden w-52 shrink-0 space-y-4 lg:block">
          <SidebarBlocks
            blocks={leftBlocks}
            eventsEnabled={eventsEnabled}
            quickLinks={quickLinks}
            categories={categories}
            upcomingEvents={upcomingEvents}
            activePoll={null}
          />
        </aside>
      )}
      <div className="min-w-0 flex-1">{content}</div>
      {showRight && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <SidebarBlocks
            blocks={rightBlocks}
            eventsEnabled={eventsEnabled}
            quickLinks={quickLinks}
            categories={categories}
            upcomingEvents={upcomingEvents}
            activePoll={null}
          />
        </aside>
      )}
    </div>
  )
}
