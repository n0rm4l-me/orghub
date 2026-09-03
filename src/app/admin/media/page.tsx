import { requireRole } from "@/lib/rbac"
import { getMediaList, findOrphanedObjects } from "@/lib/actions/media"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { MediaGrid } from "@/components/media-grid"
import { TablePagination } from "@/components/ui/table-pagination"
import { MediaUploadButton, GlobalDropZone, MediaMigrateButton, OrphanedList } from "@/components/media-page-client"
import { Images } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Media" }

const FOLDERS = [
  { id: "", label: "All" },
  { id: "media", label: "Media" },
  { id: "articles", label: "Articles" },
  { id: "pages", label: "Pages" },
  { id: "dining", label: "Dining" },
  { id: "logos", label: "Logos" },
  { id: "orphaned", label: "Orphaned" },
]

interface Props {
  searchParams: Promise<{ q?: string; page?: string; folder?: string }>
}

export default async function MediaPage({ searchParams }: Props) {
  const user = await requireRole("EDITOR")

  const params = await searchParams
  const query = params.q?.trim() ?? ""
  const page = Math.max(1, Number(params.page) || 1)
  const folder = params.folder ?? ""

  const isOrphanedTab = folder === "orphaned" && user.role === "ADMIN"

  const [{ rows, total, perPage }, orphans] = await Promise.all([
    isOrphanedTab ? Promise.resolve({ rows: [], total: 0, perPage: 40 }) : getMediaList(page, query, folder || undefined),
    isOrphanedTab ? findOrphanedObjects() : Promise.resolve([]),
  ])

  function tabHref(folderId: string) {
    const p = new URLSearchParams()
    if (folderId) p.set("folder", folderId)
    if (query) p.set("q", query)
    return `/admin/media${p.toString() ? `?${p}` : ""}`
  }

  return (
    <div>
      <GlobalDropZone />

      <PageHeader
        title="Media"
        description={isOrphanedTab ? `${orphans.length} orphaned` : `${total} file${total === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-3">
            {user.role === "ADMIN" && <MediaMigrateButton />}
            {!isOrphanedTab && <MediaUploadButton />}
          </div>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
        {FOLDERS.map((f) => {
          if (f.id === "orphaned" && user.role !== "ADMIN") return null
          const active = folder === f.id
          const badge = f.id === "orphaned" && orphans.length > 0
            ? <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-semibold text-amber-700">{orphans.length}</span>
            : null
          return (
            <Link
              key={f.id}
              href={tabHref(f.id)}
              className={`flex shrink-0 items-center px-3 py-2 text-sm font-medium transition ${
                active ? "border-b-2 border-brand text-brand" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}{badge}
            </Link>
          )
        })}
      </div>

      {isOrphanedTab ? (
        <OrphanedList orphans={orphans} />
      ) : (
        <>
          <AdminFilters
            basePath="/admin/media"
            query={query}
            placeholder="Search files"
            showStatus={false}
          />

          {total === 0 ? (
            <EmptyState
              icon={Images}
              title={query ? "No files matched" : "No files yet"}
              description={query ? "Try a different search term." : "Upload images and PDFs to use across the portal."}
              action={query ? { label: "Clear search", href: "/admin/media" } : undefined}
            />
          ) : (
            <>
              <MediaGrid items={rows} />
              {total > perPage && (
                <TablePagination
                  basePath="/admin/media"
                  page={page}
                  totalPages={Math.ceil(total / perPage)}
                  params={params}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
