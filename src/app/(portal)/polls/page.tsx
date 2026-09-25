import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getCurrentUser } from "@/lib/rbac"
import { PollCard } from "@/components/poll-card"
import { EmptyState } from "@/components/ui/empty-state"
import { BarChart2 } from "lucide-react"
import { PortalPageLayout } from "@/components/portal-page-layout"
import { PageHeader } from "@/components/ui/page-header"

export const metadata = { title: "Polls" }

export default async function PollsPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()])
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("polls")) notFound()

  const eventsEnabled = enabled.has("events")
  const kudosEnabled = enabled.has("kudos")
  const articleLayout = settings.articleLayout ?? "sidebar-right"

  const now = new Date()
  const polls = await db.poll.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      options: {
        orderBy: { order: "asc" },
        include: { _count: { select: { votes: true } } },
      },
      _count: { select: { votes: true } },
    },
  })

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
      <PageHeader title="Polls" />

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

  return (
    <PortalPageLayout
      layout={articleLayout}
      sidebarOrder={settings.sidebarOrder}
      leftSidebarOrder={settings.leftSidebarOrder}
      eventsEnabled={eventsEnabled}
      pollsEnabled={true}
      kudosEnabled={kudosEnabled}
      gravatarsEnabled={settings.gravatarsEnabled}
      hideActivePoll
    >
      <div className="mx-auto max-w-2xl">{content}</div>
    </PortalPageLayout>
  )
}
