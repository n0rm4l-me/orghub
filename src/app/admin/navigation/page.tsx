import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { PageHeader } from "@/components/ui/page-header"
import { NavManager } from "@/components/nav-manager"

export const metadata = { title: "Navigation" }

const MODULE_META: Record<string, string> = { events: "Calendar", polls: "Polls" }

export default async function NavigationPage() {
  await requireRole("EDITOR")

  const [pages, links, settings] = await Promise.all([
    db.page.findMany({
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { id: true, title: true, slug: true, published: true, showInNav: true, parentId: true },
    }),
    db.quickLink.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }],
      select: { id: true, label: true, url: true },
    }),
    getSettings(),
  ])

  const inMenu = pages.filter((p) => p.published && p.showInNav).length
  const enabled = parseModules(settings.enabledModules)
  const navOrder = (settings.navOrder ?? "events,polls").split(",").filter(Boolean)

  // Build ordered list of enabled module items, with visibility flag
  const allModuleIds = ["events", "polls"].filter((id) => enabled.has(id as "events" | "polls"))
  const orderedModuleIds = [
    ...navOrder.filter((id) => allModuleIds.includes(id)),
    ...allModuleIds.filter((id) => !navOrder.includes(id)),
  ]
  const moduleItems = orderedModuleIds.map((id) => ({
    id,
    label: MODULE_META[id] ?? id,
    visible: navOrder.includes(id),
  }))

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        title="Navigation"
        description={`${inMenu} page${inMenu === 1 ? "" : "s"} in the main menu · ${links.length} quick link${links.length === 1 ? "" : "s"}`}
      />
      <NavManager moduleItems={moduleItems} pages={pages} links={links} />
    </div>
  )
}
