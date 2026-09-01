export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Venue name + meal tabs */}
      <div className="space-y-3">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>

      {/* Menu sections */}
      {[0, 1].map((section) => (
        <div key={section} className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="aspect-[4/3] w-full animate-pulse bg-gray-100 dark:bg-gray-800" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="flex gap-1">
                    <div className="h-4 w-12 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
                    <div className="h-4 w-10 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
