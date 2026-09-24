import { Skeleton, SkeletonText } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-36" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {[44, 64, 80, 68, 60, 56].map((w, i) => (
          <Skeleton key={i} className="h-6 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <Skeleton className="h-14 w-[52px] shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <SkeletonText lines={2} />
              <div className="flex gap-3 pt-1">
                <Skeleton className="h-4 w-14 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
