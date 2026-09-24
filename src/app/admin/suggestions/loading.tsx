import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />

      {/* Status stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="mt-2 h-8 w-10" />
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
      <TableSkeleton rows={8} cols={7} />
    </div>
  )
}
