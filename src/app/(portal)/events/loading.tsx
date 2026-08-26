import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
      {/* calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <Skeleton key={d} className="m-3 h-3 w-8" />
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[80px] border-b border-r border-gray-100 p-2">
              <Skeleton className="mb-1.5 h-4 w-6" />
              {i % 5 === 0 && <Skeleton className="h-5 w-full rounded-md" />}
              {i % 7 === 2 && <Skeleton className="mt-1 h-5 w-3/4 rounded-md" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
