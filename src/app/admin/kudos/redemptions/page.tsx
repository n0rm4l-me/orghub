import { requireRole } from "@/lib/rbac"
import { getKudosRedemptions, rejectRedemption } from "@/lib/actions/kudos"
import { PageHeader } from "@/components/ui/page-header"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"
import { TablePagination } from "@/components/ui/table-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { RejectButton } from "@/components/ui/reject-button"
import { Coins, ArrowLeft } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Redemptions" }

const PER_PAGE = 30

const STATUS_OPTIONS = [
  { value: "PENDING",  label: "Pending" },
  { value: "DONE",     label: "Done" },
  { value: "FAILED",   label: "Failed" },
  { value: "REJECTED", label: "Rejected" },
]

interface Props {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}

type Row = {
  id: string
  amount: number
  status: "PENDING" | "DONE" | "FAILED" | "REJECTED"
  createdAt: Date
  webhookResponse: string | null
  user: { id: string; name: string | null; email: string }
  redeemType: { id: string; label: string } | null
}

const STATUS_BADGE: Record<Row["status"], string> = {
  PENDING:  "bg-amber-50 text-amber-600",
  DONE:     "bg-emerald-50 text-emerald-600",
  FAILED:   "bg-red-50 text-red-600",
  REJECTED: "bg-gray-100 text-gray-500",
}

const columns: AdminTableCol<Row>[] = [
  {
    id: "user",
    header: "User",
    width: "w-36",
    type: "text",
    render: (r) => (
      <div className="truncate text-sm text-gray-700" title={r.user.name ?? r.user.email}>
        {r.user.name ?? r.user.email.split("@")[0]}
      </div>
    ),
  },
  {
    id: "type",
    header: "Type",
    width: "w-40",
    type: "text",
    hideOnMobile: true,
    render: (r) => r.redeemType
      ? <span className="block truncate text-xs text-gray-600" title={r.redeemType.label}>{r.redeemType.label}</span>
      : <span className="text-xs text-gray-300">—</span>,
  },
  {
    id: "amount",
    header: "Coins",
    width: "w-20",
    type: "center",
    render: (r) => <span className="text-sm font-semibold text-brand">{r.amount}</span>,
  },
  {
    id: "date",
    header: "Date",
    width: "w-32",
    type: "text",
    hideOnMobile: true,
    render: (r) => (
      <span className="text-xs text-gray-400">
        {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "w-28",
    type: "center",
    render: (r) => (
      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[r.status]}`}>
        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    width: "w-24 sm:w-28",
    type: "actions",
    render: (r) =>
      r.status === "PENDING" ? (
        <RejectButton
          onReject={rejectRedemption.bind(null, r.id)}
          name={r.user.name ?? r.user.email.split("@")[0]}
        />
      ) : null,
  },
]

export default async function AdminRedemptionsPage({ searchParams }: Props) {
  await requireRole("ADMIN")
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const query = params.q?.trim() || undefined
  const status = params.status || undefined
  const { rows, total } = await getKudosRedemptions(page, PER_PAGE, query, status)

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/kudos"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Back to kudos
        </Link>
      </div>

      <PageHeader
        title="Redemptions"
        description={`${total} request${total === 1 ? "" : "s"}${query || status ? " matched" : " total"}`}
      />

      <AdminFilters
        basePath="/admin/kudos/redemptions"
        query={query}
        status={status}
        placeholder="Search by name or email"
        statusOptions={STATUS_OPTIONS}
      />

      {total === 0 ? (
        query || status ? (
          <EmptyState
            icon={Coins}
            title="Nothing matched"
            description="Try a different search or clear the filter."
            action={{ label: "Show all", href: "/admin/kudos/redemptions" }}
          />
        ) : (
          <EmptyState
            icon={Coins}
            title="No redemptions yet"
            description="Redemption requests will appear here once employees redeem their coins."
          />
        )
      ) : (
        <AdminTable columns={columns} rows={rows as Row[]} rowKey={(r) => r.id} rowAlign="middle" />
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/admin/kudos/redemptions"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}
    </div>
  )
}
