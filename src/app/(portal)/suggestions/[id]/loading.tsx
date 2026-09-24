import { Skeleton, SkeletonText } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <Skeleton className="mb-5 h-4 w-36" />

      {/* Title row */}
      <div className="flex flex-wrap items-start gap-4">
        <Skeleton className="h-14 w-[52px] shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <SkeletonText lines={4} />
      </div>

      {/* Comments */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
        <Skeleton className="mb-5 h-4 w-28" />
        <div className="mb-6 space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  )
}
