import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Skeleton className="h-7 w-40" />

      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <Skeleton className="size-12 rounded-xl" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
