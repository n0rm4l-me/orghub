import { PanelSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="max-w-2xl">
      <PanelSkeleton rows={5} />
    </div>
  )
}
