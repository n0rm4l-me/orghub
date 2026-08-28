import { requireRole } from "@/lib/rbac"
import { getKudosAdminList, getKudosStats } from "@/lib/actions/kudos"
import { deleteKudos } from "@/lib/actions/kudos"
import { PageHeader } from "@/components/ui/page-header"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"
import { DeleteButton } from "@/components/ui/delete-button"
import { TablePagination } from "@/components/ui/table-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { Award, TrendingUp, Users, History } from "lucide-react"
import { StatCard } from "@/components/ui/stat-card"
import Link from "next/link"

export const metadata = { title: "Kudos" }

const PER_PAGE = 30

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>
}

type KudosRow = {
  id: string
  amount: number
  message: string
  value: string | null
  createdAt: Date
  from: { id: string; name: string | null; email: string }
  to:   { id: string; name: string | null; email: string }
}

const columns: AdminTableCol<KudosRow>[] = [
  {
    id: "from",
    header: "From",
    width: "w-24 sm:w-40",
    type: "text",
    render: (k) => (
      <div className="truncate text-sm text-gray-700" title={k.from.name ?? k.from.email}>
        {k.from.name ?? k.from.email.split("@")[0]}
      </div>
    ),
  },
  {
    id: "to",
    header: "To",
    width: "w-24 sm:w-40",
    type: "text",
    render: (k) => (
      <div className="truncate text-sm text-gray-700" title={k.to.name ?? k.to.email}>
        {k.to.name ?? k.to.email.split("@")[0]}
      </div>
    ),
  },
  {
    id: "amount",
    header: "Coins",
    width: "w-16",
    type: "center",
    hideOnMobile: true,
    render: (k) => <span className="text-sm font-semibold text-brand">{k.amount}</span>,
  },
  {
    id: "value",
    header: "Value",
    width: "w-36",
    type: "text",
    hideOnMobile: true,
    render: (k) => k.value ? (
      <span className="inline-block whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
        {k.value}
      </span>
    ) : <span className="text-xs text-gray-400">—</span>,
  },
  {
    id: "message",
    header: "Message",
    type: "text",
    render: (k) => (
      <div className="truncate text-sm text-gray-700" title={k.message}>{k.message}</div>
    ),
  },
  {
    id: "date",
    header: "Date",
    width: "w-32",
    type: "text",
    hideOnMobile: true,
    render: (k) => (
      <span className="text-xs text-gray-400">
        {new Date(k.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    width: "w-20 sm:w-36",
    type: "actions",
    render: (k) => (
      <DeleteButton
        entity="kudos entry"
        name={`${k.from.name ?? k.from.email} → ${k.to.name ?? k.to.email}`}
        onDelete={deleteKudos.bind(null, k.id)}
        variant="icon"
      />
    ),
  },
]

export default async function AdminKudosPage({ searchParams }: Props) {
  await requireRole("ADMIN")

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const query = params.q?.trim() || undefined

  const [{ rows, total }, stats] = await Promise.all([
    getKudosAdminList(page, PER_PAGE, query),
    getKudosStats(),
  ])

  return (
    <div>
      <PageHeader
        title="Kudos"
        description={`${total} entr${total === 1 ? "y" : "ies"}${query ? " matched" : " total"}`}
        action={
          <Link
            href="/admin/kudos/redemptions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <History className="size-4" aria-hidden />
            Redemptions
          </Link>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Award}       label="Sent this month" value={stats.totalThisMonth} sub="Recognitions" />
        <StatCard icon={TrendingUp}  label="All time"        value={stats.totalAllTime}   sub="Total recognitions" />
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <p className="text-sm text-gray-500">Top recipients</p>
            <Users className="size-4 text-gray-300" aria-hidden />
          </div>
          {stats.topRecipients.length === 0
            ? <p className="mt-2 text-xs text-gray-400">No data yet</p>
            : <ol className="mt-2 space-y-1.5">
                {stats.topRecipients.map((r, i) => (
                  <li key={r.user?.id ?? i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-gray-700">{r.user?.name ?? r.user?.email?.split("@")[0] ?? "—"}</span>
                    <span className="shrink-0 font-semibold text-brand">{r.total}</span>
                  </li>
                ))}
              </ol>
          }
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <p className="text-sm text-gray-500">Top senders</p>
            <Users className="size-4 text-gray-300" aria-hidden />
          </div>
          {stats.topSenders.length === 0
            ? <p className="mt-2 text-xs text-gray-400">No data yet</p>
            : <ol className="mt-2 space-y-1.5">
                {stats.topSenders.map((s, i) => (
                  <li key={s.user?.id ?? i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-gray-700">{s.user?.name ?? s.user?.email?.split("@")[0] ?? "—"}</span>
                    <span className="shrink-0 font-semibold text-brand">{s.total}</span>
                  </li>
                ))}
              </ol>
          }
        </div>
      </div>

      {stats.topValues.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {stats.topValues.map((v) => (
            <span key={v.value} className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
              {v.value}
              <span className="rounded-full bg-brand/20 px-1.5 py-0.5 text-[10px] font-bold">{v.count}</span>
            </span>
          ))}
        </div>
      )}

      <AdminFilters
        basePath="/admin/kudos"
        query={query}
        placeholder="Search by name, message, or value"
        showStatus={false}
      />

      {total === 0 ? (
        query ? (
          <EmptyState
            icon={Award}
            title="Nothing matched"
            description="Try a different search term."
            action={{ label: "Show all kudos", href: "/admin/kudos" }}
          />
        ) : (
          <EmptyState
            icon={Award}
            title="No kudos yet"
            description="Kudos will appear here once employees start recognising each other."
          />
        )
      ) : (
        <AdminTable columns={columns} rows={rows as KudosRow[]} rowKey={(k) => k.id} />
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/admin/kudos"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}
    </div>
  )
}
