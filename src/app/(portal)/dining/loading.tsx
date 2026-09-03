export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="h-7 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />

      {[0, 1].map((group) => (
        <div key={group} className="space-y-3">
          <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="size-12 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
                <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
