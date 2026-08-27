import { requireRole } from "@/lib/rbac"
import { getKudosAdminList } from "@/lib/actions/kudos"
import { deleteKudos } from "@/lib/actions/kudos"
import { PageHeader } from "@/components/ui/page-header"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"
import { DeleteButton } from "@/components/ui/delete-button"
import { TablePagination } from "@/components/ui/table-pagination"
import { EmptyState } from "@/components/ui/empty-state"
import { Award } from "lucide-react"

export const metadata = { title: "Kudos" }

const PER_PAGE = 30

interface Props {
  searchParams: Promise<{ page?: string }>
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
    width: "w-36",
    type: "text",
    render: (k) => (
      <span className="text-sm text-gray-700">{k.from.name ?? k.from.email.split("@")[0]}</span>
    ),
  },
  {
    id: "to",
    header: "To",
    width: "w-36",
    type: "text",
    render: (k) => (
      <span className="text-sm text-gray-700">{k.to.name ?? k.to.email.split("@")[0]}</span>
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
    id: "message",
    header: "Message",
    type: "text",
    render: (k) => (
      <>
        <p className="truncate text-sm text-gray-700" title={k.message}>{k.message}</p>
        {k.value && (
          <span className="mt-0.5 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
            {k.value}
          </span>
        )}
      </>
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
    width: "w-20",
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

  const { rows, total } = await getKudosAdminList(page, PER_PAGE)

  return (
    <div>
      <PageHeader
        title="Kudos"
        description={`${total} entr${total === 1 ? "y" : "ies"} total`}
      />

      {total === 0 ? (
        <EmptyState
          icon={Award}
          title="No kudos yet"
          description="Kudos will appear here once employees start recognising each other."
        />
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
