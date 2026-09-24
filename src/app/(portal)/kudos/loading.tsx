import { Skeleton, SkeletonText } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>

      {/* Balance card */}
      <div className="mb-6 flex gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 space-y-1.5 py-2 text-center">
            <Skeleton className="mx-auto h-7 w-10" />
            <Skeleton className="mx-auto h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Wall */}
      <Skeleton className="mb-3 h-4 w-28" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <Skeleton className="mt-0.5 size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <SkeletonText lines={2} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
