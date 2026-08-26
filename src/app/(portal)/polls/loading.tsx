import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="mb-6 h-8 w-24" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
          >
            <Skeleton className="mb-4 h-5 w-3/4" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-9 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="mt-4 h-9 w-full rounded-lg" />
            <Skeleton className="mt-3 h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
