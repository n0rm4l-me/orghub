import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <Skeleton className="mb-4 h-8 w-72 rounded-lg" />
      <TableSkeleton rows={10} cols={4} />
    </div>
  )
}
