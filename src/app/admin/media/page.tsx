import { requireRole } from "@/lib/rbac"
import { getMediaList } from "@/lib/actions/media"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { MediaGrid } from "@/components/media-grid"
import { TablePagination } from "@/components/ui/table-pagination"
import { MediaUploadButton, GlobalDropZone } from "@/components/media-page-client"
import { Images } from "lucide-react"

export const metadata = { title: "Media" }

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function MediaPage({ searchParams }: Props) {
  await requireRole("EDITOR")

  const params = await searchParams
  const query = params.q?.trim() ?? ""
  const page = Math.max(1, Number(params.page) || 1)

  const { rows, total, perPage } = await getMediaList(page, query)

  return (
    <div>
      <GlobalDropZone />

      <PageHeader
        title="Media"
        description={`${total} file${total === 1 ? "" : "s"}`}
        action={<MediaUploadButton />}
      />

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
    </div>
  )
}
