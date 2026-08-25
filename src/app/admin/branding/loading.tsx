import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="max-w-2xl">
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <Skeleton className="mb-1.5 h-3.5 w-20" />
            <Skeleton className="h-2.5 w-72" />
          </div>
          <div className="space-y-5 px-5 py-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-1.5 h-3.5 w-24" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="mt-1.5 h-2.5 w-2/3" />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-gray-100 bg-gray-50/60 px-5 py-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <Skeleton className="mb-1.5 h-3.5 w-16" />
            <Skeleton className="h-2.5 w-64" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
