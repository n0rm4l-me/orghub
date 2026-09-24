import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />

      {/* Folder tabs */}
      <div className="mb-4 flex gap-4 border-b border-border pb-2">
        {[36, 44, 52, 40, 48, 44, 60].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: w }} />
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="space-y-1.5 p-2.5">
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
