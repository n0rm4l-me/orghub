import { notFound } from "next/navigation"
import { Award } from "lucide-react"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getCurrentUser } from "@/lib/rbac"
import { gravatarUrl } from "@/lib/gravatar"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { getKudosWall, getMyKudosBalance, getTopKudosRecipients, getMyRedemptions, getRedeemTypes } from "@/lib/actions/kudos"
import { createNotification } from "@/lib/notifications"
import { SendKudosButton } from "@/components/send-kudos-button"
import { TablePagination } from "@/components/ui/table-pagination"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { SidebarBlocks, type ActivePollData, type TopKudosEntry } from "@/components/sidebar-blocks"
import { RedeemableBalance } from "@/components/redeemable-balance"

export const metadata = { title: "Kudos" }

const WALL_PER_PAGE = 20
const REDEMPTIONS_PER_PAGE = 5

interface Props {
  searchParams: Promise<{ page?: string; rpage?: string }>
}

const DATE_FMT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }

export default async function KudosPage({ searchParams }: Props) {
  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("kudos")) notFound()

  const params = await searchParams
  const page  = Math.max(1, Number(params.page)  || 1)
  const rpage = Math.max(1, Number(params.rpage) || 1)

  const kudosLayout = settings.kudosLayout ?? "content"
  const rightBlocks = settings.sidebarOrder?.split(",").filter(Boolean) ?? ["quickLinks", "browseByTopic", "upcomingEvents"]
  const leftBlocks  = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const showLeft  = kudosLayout === "sidebar-left"  || kudosLayout === "sidebar-both"
  const showRight = kudosLayout === "sidebar-right" || kudosLayout === "sidebar-both"
  const allBlocks = [...rightBlocks, ...leftBlocks]

  const eventsEnabled = enabled.has("events")
  const pollsEnabled  = enabled.has("polls")

  const [user, { rows, total }, balance, quickLinks, upcomingEvents, categories, { rows: redemptions, total: redemptionsTotal }, redeemTypes] = await Promise.all([
    getCurrentUser(),
    getKudosWall(page, WALL_PER_PAGE),
    getMyKudosBalance(),
    getQuickLinks(),
    getUpcomingEvents(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    getMyRedemptions(rpage, REDEMPTIONS_PER_PAGE),
    getRedeemTypes(true),
  ])

  // Lazy monthly coins reset notification
  if (user && balance && balance.budget > 0 && balance.spentThisMonth === 0) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const alreadyNotified = await db.notification.findFirst({
      where: { userId: user.id, type: "kudos.month_reset", createdAt: { gte: monthStart } },
      select: { id: true },
    })
    if (!alreadyNotified) {
      await createNotification(
        user.id,
        "kudos.month_reset",
        "Your monthly kudos coins are ready",
        `You have ${balance.budget} coins to send this month.`,
        "/kudos",
      ).catch(() => {})
    }
  }

  const kudosValues = settings.kudosValues.split(",").map((v) => v.trim()).filter(Boolean)

  const allUsers = user
    ? await db.user.findMany({
        where: { active: true, NOT: { id: user.id } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : []

  let activePollData: ActivePollData | null = null
  if (pollsEnabled && allBlocks.includes("activePolls")) {
    const activePollRaw = await db.poll.findFirst({
      where: { status: "ACTIVE" },
      include: { options: { include: { _count: { select: { votes: true } } }, orderBy: { order: "asc" } }, _count: { select: { votes: true } } },
    })
    if (activePollRaw) {
      const votedOptionIds = user
        ? (await db.pollVote.findMany({ where: { pollId: activePollRaw.id, userId: user.id }, select: { optionId: true } })).map((v) => v.optionId)
        : []
      activePollData = {
        poll: { id: activePollRaw.id, question: activePollRaw.question, anonymous: activePollRaw.anonymous, multiChoice: activePollRaw.multiChoice, resultsVisibility: activePollRaw.resultsVisibility, status: activePollRaw.status, endsAt: activePollRaw.endsAt },
        options: activePollRaw.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes })),
        totalVotes: activePollRaw._count.votes,
        votedOptionIds,
      }
    }
  }

  let topKudosData: TopKudosEntry[] = []
  if (allBlocks.includes("topKudos")) {
    topKudosData = await getTopKudosRecipients(5)
  }

  const content = (
    <>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Kudos wall</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recognise your colleagues for their contributions.</p>
        </div>
        {user && balance && (
          <div className="flex flex-col items-end gap-2">
            <SendKudosButton
              users={allUsers}
              values={kudosValues}
              monthlyBudget={balance.budget}
              remaining={balance.remaining}
            />
            <p className="text-xs text-gray-400">
              {balance.budget > 0
                ? `${balance.remaining ?? 0} of ${balance.budget} coins left this month`
                : "Unlimited coins"}
            </p>
          </div>
        )}
      </div>

      {/* Balance card */}
      {user && balance && (
        <div className="mb-6 flex gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex-1 py-2 text-center">
            <p className="text-2xl font-bold text-brand">{balance.totalReceived}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Received</p>
          </div>
          <div className="w-px bg-gray-100 dark:bg-gray-700" />
          <div className="flex-1 py-2 text-center">
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{balance.spentThisMonth}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Sent this month</p>
          </div>
          {balance.redeemEnabled && (
            <>
              <div className="w-px bg-gray-100 dark:bg-gray-700" />
              {balance.available > 0 ? (
                <RedeemableBalance available={balance.available} types={redeemTypes} />
              ) : (
                <div className="flex-1 py-2 text-center">
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">0</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Available to redeem</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Redemption history */}
      {redemptions.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Redemption history</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="w-32 px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-center">Type</th>
                  <th className="w-20 px-4 py-2.5 text-center">Coins</th>
                  <th className="w-28 px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {redemptions.map((r) => (
                  <tr key={r.id} className="align-middle">
                    <td className="w-32 whitespace-nowrap px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                      {r.redeemType?.label ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="w-20 px-4 py-2.5 text-center text-sm font-semibold text-brand">{r.amount}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.status === "DONE"     ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        r.status === "FAILED"   ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                        r.status === "REJECTED" ? "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500" :
                                                   "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {r.status === "DONE" ? "Done" : r.status === "FAILED" ? "Failed" : r.status === "REJECTED" ? "Rejected" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {redemptionsTotal > REDEMPTIONS_PER_PAGE && (
            <TablePagination
              basePath="/kudos"
              page={rpage}
              totalPages={Math.ceil(redemptionsTotal / REDEMPTIONS_PER_PAGE)}
              params={{ ...params, rpage: String(rpage) }}
              pageParam="rpage"
            />
          )}
        </div>
      )}

      {/* Wall */}
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Recent kudos</h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-16 text-center">
          <Award className="mx-auto mb-3 size-10 text-gray-300 dark:text-gray-600" aria-hidden />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No kudos yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Be the first to recognise a colleague.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((k) => {
            const fromSrc = k.from.avatarUrl ?? (settings.gravatarsEnabled ? gravatarUrl(k.from.email, 40) : undefined)
            const toSrc   = k.to.avatarUrl   ?? (settings.gravatarsEnabled ? gravatarUrl(k.to.email,   40) : undefined)
            const fromInitials = initialsOf(k.from.name ?? k.from.email)
            const toInitials   = initialsOf(k.to.name   ?? k.to.email)
            return (
              <li key={k.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="mt-0.5 size-9 shrink-0">
                    {toSrc && <AvatarImage src={toSrc} alt="" />}
                    <AvatarFallback className="bg-emerald-50 text-[10px] font-bold text-emerald-600">{toInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {k.to.name ?? k.to.email.split("@")[0]}
                      </span>
                      <span className="font-semibold text-brand">+{k.amount} {k.amount === 1 ? "coin" : "coins"}</span>
                      {k.value && (
                        <span className="inline-block rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          {k.value}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{k.message}</p>
                    <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(k.createdAt).toLocaleDateString("en-US", DATE_FMT)}
                      {" · from "}
                      {k.from.name ?? k.from.email.split("@")[0]}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {total > WALL_PER_PAGE && (
        <TablePagination
          basePath="/kudos"
          page={page}
          totalPages={Math.ceil(total / WALL_PER_PAGE)}
          params={params}
        />
      )}
    </>
  )

  const sidebarProps = {
    eventsEnabled,
    kudosEnabled: true,
    quickLinks,
    categories,
    upcomingEvents,
    activePoll: activePollData,
    topKudos: topKudosData,
    gravatarsEnabled: settings.gravatarsEnabled,
  }

  if (!showLeft && !showRight) {
    return <div className="max-w-2xl mx-auto">{content}</div>
  }

  return (
    <div className="flex items-start gap-8">
      {showLeft && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <SidebarBlocks blocks={leftBlocks} {...sidebarProps} />
        </aside>
      )}
      <div className="min-w-0 flex-1">{content}</div>
      {showRight && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <SidebarBlocks blocks={rightBlocks} {...sidebarProps} />
        </aside>
      )}
    </div>
  )
}

function initialsOf(name: string) {
  return name.split(/[\s@.]+/).filter(Boolean).map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "?"
}
