import Link from "next/link"
import { requireRole } from "@/lib/rbac"
import { getSuggestionAdminList, deleteSuggestion, toggleHideSuggestion } from "@/lib/actions/suggestions"
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/suggestion-constants"
import { PageHeader } from "@/components/ui/page-header"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"
import { DeleteButton } from "@/components/ui/delete-button"
import { TablePagination } from "@/components/ui/table-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { Lightbulb, EyeOff, Eye, MessageSquare, Pencil } from "lucide-react"
import { db } from "@/lib/db"
import type { SuggestionStatus } from "@prisma/client"

export const metadata = { title: "Suggestions" }

const PER_PAGE = 30

interface Props {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}

type Row = {
  id: string
  title: string
  body: string
  category: string | null  // mapped to name by getSuggestionAdminList
  status: SuggestionStatus
  adminNote: string | null
  anonymous?: boolean
  hidden: boolean
  createdAt: Date
  author: { id: string; name: string | null; email: string } | null
  _count: { votes: number; comments: number }
}

export default async function AdminSuggestionsPage({ searchParams }: Props) {
  await requireRole("EDITOR")

  const params = await searchParams
  const page   = Math.max(1, Number(params.page) || 1)
  const query  = params.q?.trim() || undefined
  const status = Object.keys(STATUS_LABEL).includes(params.status ?? "")
    ? (params.status as SuggestionStatus)
    : undefined

  const [{ rows, total }, counts] = await Promise.all([
    getSuggestionAdminList(page, PER_PAGE, query, status),
    db.suggestion.groupBy({ by: ["status"], _count: { _all: true } }),
  ])

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<SuggestionStatus, number>
  const totalAll = Object.values(byStatus).reduce((s, v) => s + v, 0)
  const openCount = byStatus.OPEN ?? 0

  const columns: AdminTableCol<Row>[] = [
    {
      id: "title",
      header: "Title",
      type: "text",
      render: (r) => (
        <>
          <Link
            href={`/admin/suggestions/${r.id}`}
            className={`block truncate text-sm font-medium transition-colors hover:text-brand ${
              r.hidden ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-gray-100"
            }`}
            title={r.title}
          >
            {r.title}
          </Link>
          {(r.category || r.hidden) && (
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {r.hidden && (
                <span
                  className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5
                    py-0.5 align-middle text-[10px] font-semibold text-amber-700
                    dark:bg-amber-900/30 dark:text-amber-300"
                >
                  <EyeOff className="size-2.5" aria-hidden />
                  Hidden
                </span>
              )}
              {r.category}
            </p>
          )}
        </>
      ),
    },
    {
      id: "author",
      header: "Author",
      width: "w-36",
      type: "center",
      hideOnMobile: true,
      render: (r) => (
        <span className="block truncate text-sm text-gray-500">
          {r.anonymous ? "Anonymous" : (r.author?.name ?? r.author?.email?.split("@")[0] ?? "—")}
        </span>
      ),
    },
    {
      id: "votes",
      header: "Votes",
      width: "w-16",
      type: "number",
      hideOnMobile: true,
      render: (r) => r._count.votes,
    },
    {
      id: "comments",
      header: <MessageSquare className="mx-auto size-3.5" aria-hidden />,
      headerTitle: "Comments",
      width: "w-12",
      type: "number",
      hideOnMobile: true,
      render: (r) => r._count.comments,
    },
    {
      id: "status",
      header: "Status",
      width: "w-36",
      type: "center",
      render: (r) => (
        <span
          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs
            font-medium ${STATUS_COLOR[r.status]}`}
        >
          {STATUS_LABEL[r.status]}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      width: "w-24",
      type: "date",
      hideOnMobile: true,
      render: (r) =>
        new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    },
    {
      id: "actions",
      header: "Actions",
      width: "w-36",
      type: "actions",
      render: (r) => (
        <>
          <Link
            href={`/admin/suggestions/${r.id}`}
            aria-label="Edit suggestion"
            className="grid size-7 place-items-center rounded-md text-gray-400 transition
              hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Pencil className="size-3.5" aria-hidden />
          </Link>
          <form action={toggleHideSuggestion.bind(null, r.id)} className="contents">
            <button
              type="submit"
              aria-label={r.hidden ? "Show suggestion" : "Hide suggestion"}
              className="grid size-7 place-items-center rounded-md text-gray-400 transition
                hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              {r.hidden
                ? <Eye className="size-3.5" aria-hidden />
                : <EyeOff className="size-3.5" aria-hidden />}
            </button>
          </form>
          <DeleteButton
            entity="suggestion"
            name={r.title}
            onDelete={deleteSuggestion.bind(null, r.id)}
            variant="icon"
          />
        </>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Suggestions"
        description={`${totalAll} total${query ? ", filtered" : ""}`}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(Object.keys(STATUS_LABEL) as SuggestionStatus[]).map((s) => (
          <a
            key={s}
            href={`/admin/suggestions?status=${s}`}
            className={`rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
              status === s ? "ring-2 ring-brand/30" : ""
            }`}
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{STATUS_LABEL[s]}</p>
            <p className={`mt-1 text-3xl font-semibold tabular-nums ${STATUS_COLOR[s].split(" ")[1]}`}>
              {byStatus[s] ?? 0}
            </p>
          </a>
        ))}
      </div>

      <AdminFilters
        basePath="/admin/suggestions"
        query={query}
        placeholder="Search by title or description"
        showStatus={false}
      />

      {total === 0 ? (
        query || status ? (
          <EmptyState
            icon={Lightbulb}
            title="Nothing matched"
            description="Try different filters."
            action={{ label: "Show all", href: "/admin/suggestions" }}
          />
        ) : (
          <EmptyState
            icon={Lightbulb}
            title="No suggestions yet"
            description="Suggestions will appear here once employees start submitting ideas."
          />
        )
      ) : (
        <AdminTable columns={columns} rows={rows as Row[]} rowKey={(r) => r.id} />
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/admin/suggestions"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}
    </div>
  )
}
