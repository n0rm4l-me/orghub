import { db } from "@/lib/db"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { getCurrentUser } from "@/lib/rbac"
import { getTopKudosRecipients } from "@/lib/actions/kudos"
import { SidebarBlocks, type ActivePollData, type TopKudosEntry } from "@/components/sidebar-blocks"

interface Props {
  blocks: string[]
  eventsEnabled: boolean
  pollsEnabled: boolean
  kudosEnabled: boolean
  gravatarsEnabled: boolean
  /** The polls listing page suppresses its own "active poll" widget: showing
   * "here's an active poll" is redundant while already on the page that lists
   * all of them. */
  hideActivePoll?: boolean
}

async function loadActivePollData(): Promise<ActivePollData | null> {
  const user = await getCurrentUser()
  const activePollRaw = await db.poll.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
      _count: { select: { votes: true } },
    },
  })
  if (!activePollRaw) return null

  const userVotes = user
    ? await db.pollVote.findMany({ where: { pollId: activePollRaw.id, userId: user.id }, select: { optionId: true } })
    : []
  return {
    poll: {
      id: activePollRaw.id,
      question: activePollRaw.question,
      anonymous: activePollRaw.anonymous,
      multiChoice: activePollRaw.multiChoice,
      resultsVisibility: activePollRaw.resultsVisibility,
      status: activePollRaw.status,
      endsAt: activePollRaw.endsAt,
    },
    options: activePollRaw.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes })),
    totalVotes: activePollRaw._count.votes,
    votedOptionIds: userVotes.map((v) => v.optionId),
  }
}

export async function PortalSidebarPanel({ blocks, eventsEnabled, pollsEnabled, kudosEnabled, gravatarsEnabled, hideActivePoll }: Props) {
  const showActivePoll = pollsEnabled && !hideActivePoll && blocks.includes("activePolls")
  const showTopKudos = kudosEnabled && blocks.includes("topKudos")

  const [quickLinks, upcomingEvents, categories, activePoll, topKudos] = await Promise.all([
    getQuickLinks(),
    getUpcomingEvents(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    showActivePoll ? loadActivePollData() : Promise.resolve(null),
    showTopKudos ? getTopKudosRecipients(5) : Promise.resolve([] as TopKudosEntry[]),
  ])

  return (
    <SidebarBlocks
      blocks={blocks}
      eventsEnabled={eventsEnabled}
      kudosEnabled={kudosEnabled}
      quickLinks={quickLinks}
      categories={categories}
      upcomingEvents={upcomingEvents}
      gravatarsEnabled={gravatarsEnabled}
      activePoll={activePoll}
      topKudos={topKudos}
    />
  )
}
