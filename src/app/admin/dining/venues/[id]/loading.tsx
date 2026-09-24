import { Skeleton } from "@/components/ui/skeleton"
import { PageHeaderSkeleton, PanelSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Skeleton className="mb-3 h-4 w-16" />
      <PageHeaderSkeleton />

      {/* Tabs: Settings / Dishes / Menus / Announcements */}
      <div className="mb-6 flex gap-6 border-b border-gray-200 pb-3">
        {[68, 60, 60, 96].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: w }} />
        ))}
      </div>

      {/* Settings tab: venue settings form + meal structure + nutrition params + tags */}
      <div className="space-y-6">
        <PanelSkeleton rows={3} />
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={2} />
        <PanelSkeleton rows={2} />
      </div>
    </div>
  )
}
