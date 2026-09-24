import { PageHeaderSkeleton, PanelSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="max-w-3xl">
      <PageHeaderSkeleton />
      <div className="space-y-6">
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={3} />
      </div>
    </div>
  )
}
