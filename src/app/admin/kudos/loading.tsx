import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />

      {/* Stats: two StatCard-shaped tiles, two ranked-list tiles */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="mt-2 h-8 w-12" />
            <Skeleton className="mt-1.5 h-2.5 w-28" />
          </div>
        ))}
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="size-4" />
            </div>
            <div className="mt-2 space-y-1.5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
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
