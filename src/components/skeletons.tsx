import { Skeleton, SkeletonText } from "@/components/ui/skeleton"

/** Admin table placeholder. `cols` should match the real header count. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex gap-6 border-b border-border px-6 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-6 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="flex-1">
                <Skeleton className={c === 0 ? "h-4 w-full" : "h-3 w-3/5"} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Editor screen: title field, toolbar, canvas, settings rail. */
export function EditorSkeleton() {
  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1 space-y-5">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-6" />
            ))}
          </div>
          <div className="p-6">
            <SkeletonText lines={8} />
          </div>
        </div>
      </div>
      <aside className="w-64 shrink-0 space-y-4">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2.5 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-20" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-3/4" />
          ))}
        </div>
      </aside>
    </div>
  )
}

/**
 * Header block used at the top of every admin route.
 *
 * Heights match `PageHeader` exactly (h-11 block, h-5 description) so the real
 * content lands on the same baseline the placeholder occupied.
 */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex min-h-11 items-start justify-between">
      <div>
        <Skeleton className="mb-1.5 h-6 w-40" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  )
}

/** Card with a heading strip and rows, matching `Panel`. */
export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <Skeleton className="mb-1.5 h-3.5 w-28" />
        <Skeleton className="h-2.5 w-72" />
      </div>
      <div className="divide-y divide-border px-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="size-5 shrink-0 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
            <Skeleton className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Dashboard: four stat cards over a compact activity list. */
export function DashboardSkeleton() {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="size-4" />
            </div>
            <Skeleton className="mt-2 h-8 w-12" />
            <Skeleton className="mt-1.5 h-2.5 w-24" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex h-12 items-center justify-between border-b border-border px-5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="size-1.5 shrink-0 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-24 shrink-0" />
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Settings form: labelled fields in a card. */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="max-w-xl">
      <Skeleton className="mb-1 h-7 w-40" />
      <Skeleton className="mb-8 h-3.5 w-72" />
      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="mt-2 h-2.5 w-2/3" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-10 w-32" />
    </div>
  )
}
