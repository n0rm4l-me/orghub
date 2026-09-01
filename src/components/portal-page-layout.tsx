import { Suspense } from "react"
import { PortalSidebarPanel } from "@/components/portal-sidebar-panel"

const FALLBACK = <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
const DEFAULT_RIGHT = ["quickLinks", "browseByTopic", "upcomingEvents"]

interface Props {
  layout: string
  sidebarOrder?: string | null
  leftSidebarOrder?: string | null
  eventsEnabled: boolean
  kudosEnabled: boolean
  gravatarsEnabled: boolean
  children: React.ReactNode
}

export function PortalPageLayout({
  layout,
  sidebarOrder,
  leftSidebarOrder,
  eventsEnabled,
  kudosEnabled,
  gravatarsEnabled,
  children,
}: Props) {
  const showLeft  = layout === "sidebar-left"  || layout === "sidebar-both"
  const showRight = layout === "sidebar-right" || layout === "sidebar-both"

  if (!showLeft && !showRight) return <>{children}</>

  const rightBlocks = sidebarOrder?.split(",").filter(Boolean) ?? DEFAULT_RIGHT
  const leftBlocks  = leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const panelProps  = { eventsEnabled, kudosEnabled, gravatarsEnabled }

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
