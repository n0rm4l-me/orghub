import { db } from "@/lib/db"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { SidebarBlocks } from "@/components/sidebar-blocks"

interface Props {
  blocks: string[]
  eventsEnabled: boolean
  kudosEnabled: boolean
  gravatarsEnabled: boolean
}

export async function PortalSidebarPanel({ blocks, eventsEnabled, kudosEnabled, gravatarsEnabled }: Props) {
  const [quickLinks, upcomingEvents, categories] = await Promise.all([
    getQuickLinks(),
    getUpcomingEvents(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ])

  return (
    <SidebarBlocks
      blocks={blocks}
      eventsEnabled={eventsEnabled}
      kudosEnabled={kudosEnabled}
      quickLinks={quickLinks}
      categories={categories}
      upcomingEvents={upcomingEvents}
      gravatarsEnabled={gravatarsEnabled}
    />
  )
}
