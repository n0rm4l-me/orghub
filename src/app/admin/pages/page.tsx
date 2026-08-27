import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { Plus, Files, ExternalLink, Pencil } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { togglePagePublish, deletePage } from "@/lib/actions/pages"
import { StatusToggle } from "@/components/ui/status-toggle"
import { DeleteButton } from "@/components/ui/delete-button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { PageReorder } from "@/components/ui/page-reorder"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

export const metadata = { title: "Pages" }

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>
}

type PageRowData = {
  id: string
  title: string
  slug: string
  published: boolean
  showInNav: boolean
  updatedAt: Date
  parentId: string | null
  isFirst: boolean
  isLast: boolean
  showReorder: boolean
  indent: boolean
}

export default async function AdminPagesPage({ searchParams }: Props) {
  await requireRole("EDITOR")

  const params = await searchParams
  const query = params.q?.trim() || undefined
  const status = params.status === "published" || params.status === "draft" ? params.status : undefined
  const filtering = Boolean(query || status)

  const where: Prisma.PageWhereInput = {
    ...(status ? { published: status === "published" } : {}),
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
  }

  const pages = await db.page.findMany({
    where,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      showInNav: true,
      updatedAt: true,
      parentId: true,
    },
  })

  const published = pages.filter((p) => p.published).length
  const topLevel = filtering ? pages : pages.filter((p) => !p.parentId)
  const childrenOf = (id: string) => pages.filter((p) => p.parentId === id)

  const rows: PageRowData[] = []
  for (let i = 0; i < topLevel.length; i++) {
    const page = topLevel[i]!
    const children = filtering ? [] : childrenOf(page.id)
    rows.push({ ...page, isFirst: i === 0, isLast: i === topLevel.length - 1, showReorder: !filtering, indent: false })
    for (let j = 0; j < children.length; j++) {
      const child = children[j]!
      rows.push({ ...child, isFirst: j === 0, isLast: j === children.length - 1, showReorder: true, indent: true })
    }
  }

  const columns: AdminTableCol<PageRowData>[] = [
    ...(!filtering
      ? [
          {
            id: "reorder",
            type: "reorder" as const,
            width: "w-9",
            render: (row: PageRowData) => (
              <PageReorder
                pageId={row.id}
                label={row.title}
                isFirst={row.isFirst}
                isLast={row.isLast}
              />
            ),
          },
        ]
      : []),
    {
      id: "title",
      header: "Title",
      type: "text",
      render: (row) => (
        <div className={row.indent ? "pl-4" : ""}>
          <Link
            href={`/admin/pages/${row.id}/edit`}
            className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-brand"
            title={row.title}
          >
            {row.indent && (
              <span className="mr-1 select-none text-gray-300" aria-hidden>
                {"└ "}
              </span>
            )}
            {row.title}
          </Link>
        </div>
      ),
    },
    {
      id: "path",
      header: "Path",
      width: "w-56",
      type: "text",
      render: (row) => (
        <span className="block truncate font-mono text-xs text-gray-400">
          /pages/{row.slug}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "w-28",
      type: "center",
      render: (row) => (
        <StatusToggle
          published={row.published}
          onToggle={togglePagePublish.bind(null, row.id)}
        />
      ),
    },
    {
      id: "inMenu",
      header: "In menu",
      width: "w-28",
      type: "center",
      render: (row) =>
        row.showInNav && row.published ? (
          <span className="text-xs font-medium text-gray-600">Yes</span>
        ) : (
          <span className="text-xs text-gray-300">No</span>
        ),
    },
    {
      id: "updated",
      header: "Updated",
      width: "w-32",
      type: "date",
      render: (row) =>
        new Date(row.updatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
    },
    {
      id: "actions",
      header: "Actions",
      width: "w-28",
      type: "actions",
      render: (row) => (
        <>
          {row.published && (
            <Link
              href={`/pages/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View live page"
              className="grid size-7 place-items-center rounded-md text-gray-400 transition
                hover:bg-gray-100 hover:text-brand"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          )}
          <Link
            href={`/admin/pages/${row.id}/edit`}
            aria-label="Edit page"
            className="grid size-7 place-items-center rounded-md text-gray-400 transition
              hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil className="size-3.5" aria-hidden />
          </Link>
          <DeleteButton
            entity="page"
            name={row.title}
            onDelete={deletePage.bind(null, row.id)}
            variant="icon"
          />
        </>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Pages"
        description={`${published} published · ${pages.length - published} draft${
          pages.length - published === 1 ? "" : "s"
        }`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/navigation"
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3.5 py-2
                text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Manage menu
            </Link>
            <Link
              href="/admin/pages/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
                font-medium text-white transition hover:brightness-95 active:brightness-90"
            >
              <Plus className="size-4" aria-hidden />
              New page
            </Link>
          </div>
        }
      />

      <AdminFilters basePath="/admin/pages" query={query} status={status} placeholder="Search pages" />

      {pages.length === 0 ? (
        filtering ? (
          <EmptyState
            icon={Files}
            title="Nothing matched"
            description="Try a different search term or clear the status filter."
            action={{ label: "Show all pages", href: "/admin/pages" }}
          />
        ) : (
          <EmptyState
            icon={Files}
            title="No pages yet"
            description="Pages hold standing reference content: the handbook, HR policies, office contacts. Unlike articles they are not dated and can be linked from the main menu."
            action={{ label: "Create your first page", href: "/admin/pages/new" }}
          />
        )
      ) : (
        <AdminTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      )}
    </div>
  )
}
