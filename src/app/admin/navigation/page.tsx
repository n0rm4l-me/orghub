import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { PageHeader } from "@/components/ui/page-header"
import { NavManager } from "@/components/nav-manager"
import { SidebarOrderManager } from "@/components/sidebar-order-manager"

export const metadata = { title: "Navigation" }

const DEFAULT_ORDER = ["quickLinks", "browseByTopic", "upcomingEvents"]

export default async function NavigationPage() {
  await requireRole("EDITOR")

  const [pages, links, settings] = await Promise.all([
    db.page.findMany({
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true, published: true, showInNav: true },
    }),
    db.quickLink.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }],
      select: { id: true, label: true, url: true },
    }),
    getSettings(),
  ])

  const inMenu = pages.filter((p) => p.published && p.showInNav).length
  const sidebarOrder = settings.sidebarOrder?.split(",").filter(Boolean) ?? DEFAULT_ORDER
  const enabledModules = parseModules(settings.enabledModules)

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Navigation"
        description={`${inMenu} page${inMenu === 1 ? "" : "s"} in the main menu · ${links.length} quick link${links.length === 1 ? "" : "s"}`}
      />
      <NavManager pages={pages} links={links} />
      <div className="mt-6">
        <SidebarOrderManager initialOrder={sidebarOrder} enabledModules={enabledModules} />
      </div>
    </div>
  )
}
