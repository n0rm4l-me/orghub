import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { Fragment } from "react"
import { Plus, Files, ExternalLink, Pencil } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { togglePagePublish, deletePage } from "@/lib/actions/pages"
import { StatusToggle } from "@/components/ui/status-toggle"
import { DeleteButton } from "@/components/ui/delete-button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { PageReorder } from "@/components/ui/page-reorder"

export const metadata = { title: "Pages" }

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <colgroup>
              {!filtering && <col className="w-9" />}
              <col />
              <col className="w-56" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                {!filtering && <th className="px-2 py-3" />}
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Path</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">In menu</th>
                <th className="px-5 py-3 text-left">Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topLevel.map((page, i) => {
                const children = filtering ? [] : childrenOf(page.id)
                return (
                  <Fragment key={page.id}>
                    <PageRow
                      page={page}
                      isFirst={i === 0}
                      isLast={i === topLevel.length - 1}
                      showReorder={!filtering}
                    />
                    {children.map((child, j) => (
                      <PageRow
                        key={child.id}
                        page={child}
                        isFirst={j === 0}
                        isLast={j === children.length - 1}
                        showReorder
                        indent
                      />
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PageRow({
  page,
  isFirst,
  isLast,
  showReorder,
  indent = false,
}: {
  page: {
    id: string
    title: string
    slug: string
    published: boolean
    showInNav: boolean
    updatedAt: Date
    parentId: string | null
  }
  isFirst: boolean
  isLast: boolean
  showReorder: boolean
  indent?: boolean
}) {
  return (
    <tr className="transition-colors hover:bg-gray-50/70">
      {showReorder && (
        <td className="px-1.5 py-2">
          <PageReorder pageId={page.id} label={page.title} isFirst={isFirst} isLast={isLast} />
        </td>
      )}
      <td className="px-5 py-3">
        <div className={indent ? "pl-4" : ""}>
          <Link
            href={`/admin/pages/${page.id}/edit`}
            className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-brand"
            title={page.title}
          >
            {indent && (
              <span className="mr-1 select-none text-gray-300" aria-hidden>
                └{" "}
              </span>
            )}
            {page.title}
          </Link>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="block truncate font-mono text-xs text-gray-400">
          /pages/{page.slug}
        </span>
      </td>
      <td className="px-5 py-3">
        <StatusToggle
          published={page.published}
          onToggle={togglePagePublish.bind(null, page.id)}
        />
      </td>
      <td className="px-5 py-3">
        {page.showInNav && page.published ? (
          <span className="text-xs font-medium text-gray-600">Yes</span>
        ) : (
          <span className="text-xs text-gray-300">No</span>
        )}
      </td>
      <td className="px-5 py-3 text-xs text-gray-400">
        {new Date(page.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {page.published && (
            <Link
              href={`/pages/${page.slug}`}
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
            href={`/admin/pages/${page.id}/edit`}
            aria-label="Edit page"
            className="grid size-7 place-items-center rounded-md text-gray-400 transition
              hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil className="size-3.5" aria-hidden />
          </Link>
          <DeleteButton
            entity="page"
            name={page.title}
            onDelete={deletePage.bind(null, page.id)}
            variant="icon"
          />
        </div>
      </td>
    </tr>
  )
}
