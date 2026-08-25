import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
      <TableSkeleton rows={6} cols={6} />
    </div>
  )
}
