import { db } from "@/lib/db"
import Link from "next/link"
import { Plus, Files, ExternalLink } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { togglePagePublish, deletePage } from "@/lib/actions/pages"
import { StatusToggle } from "@/components/ui/status-toggle"
import { DeleteButton } from "@/components/ui/delete-button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"

export const metadata = { title: "Pages" }

export default async function AdminPagesPage() {
  await requireRole("EDITOR")

  const pages = await db.page.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      showInNav: true,
      updatedAt: true,
    },
  })

  const published = pages.filter((p) => p.published).length

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
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium
                text-gray-700 transition hover:bg-gray-50"
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

      {pages.length === 0 ? (
        <EmptyState
          icon={Files}
          title="No pages yet"
          description="Pages hold standing reference content: the handbook, HR policies, office contacts. Unlike articles they are not dated and can be linked from the main menu."
          action={{ label: "Create your first page", href: "/admin/pages/new" }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <colgroup>
              <col />
              <col className="w-56" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-32" />
            </colgroup>
            <thead>
              <tr
                className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400
                  uppercase"
              >
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Address</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">In menu</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((page) => (
                <tr key={page.id} className="transition-colors hover:bg-gray-50/70">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/pages/${page.id}/edit`}
                      className="block truncate text-sm font-medium text-gray-900 transition-colors
                        hover:text-brand"
                      title={page.title}
                    >
                      {page.title}
                    </Link>
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
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {page.published && (
                        <Link
                          href={`/pages/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500
                            transition hover:text-brand"
                        >
                          View
                          <ExternalLink className="size-3" aria-hidden />
                        </Link>
                      )}
                      <Link
                        href={`/admin/pages/${page.id}/edit`}
                        className="text-xs font-medium text-gray-500 transition hover:text-brand"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        entity="page"
                        name={page.title}
                        onDelete={deletePage.bind(null, page.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
