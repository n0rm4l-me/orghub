import { Suspense } from "react"
import { PortalSidebarPanel } from "@/components/portal-sidebar-panel"
import { Skeleton } from "@/components/ui/skeleton"

const FALLBACK = <Skeleton className="h-64 rounded-xl" />
const DEFAULT_RIGHT = ["quickLinks", "browseByTopic", "upcomingEvents"]

interface Props {
  layout: string
  sidebarOrder?: string | null
  leftSidebarOrder?: string | null
  eventsEnabled: boolean
  pollsEnabled: boolean
  kudosEnabled: boolean
  gravatarsEnabled: boolean
  /** Pass true from the polls listing page: showing "here's an active poll"
   * in its own sidebar is redundant there. */
  hideActivePoll?: boolean
  children: React.ReactNode
}

export function PortalPageLayout({
  layout,
  sidebarOrder,
  leftSidebarOrder,
  eventsEnabled,
  pollsEnabled,
  kudosEnabled,
  gravatarsEnabled,
  hideActivePoll,
  children,
}: Props) {
  const showLeft  = layout === "sidebar-left"  || layout === "sidebar-both"
  const showRight = layout === "sidebar-right" || layout === "sidebar-both"

  if (!showLeft && !showRight) return <>{children}</>

  const rightBlocks = sidebarOrder?.split(",").filter(Boolean) ?? DEFAULT_RIGHT
  const leftBlocks  = leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const panelProps  = { eventsEnabled, pollsEnabled, kudosEnabled, gravatarsEnabled, hideActivePoll }

  return (
    <div className="flex items-start gap-8">
      {showLeft && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <Suspense fallback={FALLBACK}>
            <PortalSidebarPanel blocks={leftBlocks} {...panelProps} />
          </Suspense>
        </aside>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {showRight && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <Suspense fallback={FALLBACK}>
            <PortalSidebarPanel blocks={rightBlocks} {...panelProps} />
          </Suspense>
        </aside>
      )}
    </div>
  )
}
