import { notFound } from "next/navigation"
import Link from "next/link"
import { Lightbulb, MessageSquare } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getCurrentUser } from "@/lib/rbac"
import { getSuggestions } from "@/lib/actions/suggestions"
import { db } from "@/lib/db"
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/suggestion-constants"
import { TablePagination } from "@/components/ui/table-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { PortalPageLayout } from "@/components/portal-page-layout"
import { SubmitSuggestionButton } from "./_submit-form"
import { VoteButton } from "./_vote-button"
import type { SuggestionStatus } from "@prisma/client"

export const metadata = { title: "Suggestions" }

const PER_PAGE = 20

const DATE_FMT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>
}

export default async function SuggestionsPage({ searchParams }: Props) {
  const settings = await getSettings()
  const enabled  = parseModules(settings.enabledModules)
  if (!enabled.has("suggestions")) notFound()

  const params = await searchParams
  const page   = Math.max(1, Number(params.page) || 1)
  const status = Object.keys(STATUS_LABEL).includes(params.status ?? "")
    ? (params.status as SuggestionStatus)
    : undefined

  const [user, { rows, total }, categories] = await Promise.all([
    getCurrentUser(),
    getSuggestions(page, PER_PAGE, status),
    db.suggestionCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  const STATUSES = Object.keys(STATUS_LABEL) as SuggestionStatus[]
  const layout = settings.suggestionsLayout ?? "content"

  const showSidebar = layout === "sidebar-right" || layout === "sidebar-left" || layout === "sidebar-both"

  return (
    <PortalPageLayout
      layout={layout}
      sidebarOrder={settings.sidebarOrder}
      leftSidebarOrder={settings.leftSidebarOrder}
      eventsEnabled={enabled.has("events")}
      kudosEnabled={enabled.has("kudos")}
      gravatarsEnabled={settings.gravatarsEnabled}
    >
    <div className={showSidebar ? undefined : "mx-auto max-w-3xl"}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Suggestions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Share ideas, vote on what matters most, and track progress.
          </p>
        </div>
        {user && <SubmitSuggestionButton categories={categories} />}
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <a
          href="/suggestions"
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            !status
              ? "border-brand bg-brand/10 text-brand"
              : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
          }`}
        >
          All
        </a>
        {STATUSES.map((s) => (
          <a
            key={s}
            href={`/suggestions?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              status === s
                ? "border-brand bg-brand/10 text-brand"
                : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
            }`}
          >
            {STATUS_LABEL[s]}
          </a>
        ))}
      </div>

      {/* List */}
      {total === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No suggestions yet"
          description={status ? "No suggestions with this status." : "Be the first to share an idea!"}
          {...(status ? { action: { label: "Show all", href: "/suggestions" } } : {})}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((s) => (
            <div
              key={s.id}
              className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-sm
                dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Vote column */}
              <div className="shrink-0 pt-0.5">
                <VoteButton
                  suggestionId={s.id}
                  initialCount={s.voteCount}
                  initialVoted={s.voted}
                  loggedIn={!!user}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <Link
                    href={`/suggestions/${s.id}`}
                    className="flex-1 text-base font-semibold leading-snug text-gray-900 hover:text-brand
                      dark:text-gray-100 dark:hover:text-brand"
                  >
                    {s.title}
                  </Link>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>

                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                  {s.body}
                </p>

                {s.adminNote && (
                  <div className="mt-2 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2">
                    <p className="text-xs font-medium text-brand">Admin note</p>
                    <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{s.adminNote}</p>
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {s.category && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500 dark:bg-gray-800">
                      {s.category}
                    </span>
                  )}
                  <span>{new Date(s.createdAt).toLocaleDateString("en-US", DATE_FMT)}</span>
                  <span>by {s.author?.name ?? "Anonymous"}</span>
                  {s.commentCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="size-3" aria-hidden />
                      {s.commentCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/suggestions"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={await searchParams}
        />
      )}
    </div>
    </PortalPageLayout>
  )
}
