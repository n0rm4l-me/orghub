import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      {/* Matches the AdminFilters row: search field plus the status segmented control. */}
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="h-9 w-56 shrink-0 rounded-lg" />
      </div>
      <TableSkeleton rows={8} cols={6} />
    </div>
  )
}
