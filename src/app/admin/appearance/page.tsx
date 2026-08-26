import { getSettings } from "@/lib/settings"
import { requireRole } from "@/lib/rbac"
import { parseModules } from "@/lib/modules"
import { PageHeader } from "@/components/ui/page-header"
import { BrandForm } from "@/components/brand-form"
import { LayoutForm } from "@/components/layout-form"
import { SidebarWidgetsForm } from "@/components/sidebar-widgets-form"

export const metadata = { title: "Appearance" }

const DEFAULT_RIGHT = ["quickLinks", "browseByTopic", "upcomingEvents"]

export default async function AppearancePage() {
  await requireRole("ADMIN")
  const settings = await getSettings()
  const rightOrder = settings.sidebarOrder?.split(",").filter(Boolean) ?? DEFAULT_RIGHT
  const leftOrder  = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const enabledModules = parseModules(settings.enabledModules)

  return (
    <div className="space-y-10">
      <PageHeader
        title="Appearance"
        description="Branding, colours, layout, and sidebar widgets."
      />

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Brand identity
        </h2>
        <BrandForm
          siteName={settings.siteName}
          logoUrl={settings.logoUrl}
          logoOnLightUrl={settings.logoOnLightUrl}
          primaryColor={settings.primaryColor}
        />
      </section>

      <div className="max-w-2xl space-y-10">
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Layout
          </h2>
          <LayoutForm
            feedLayout={settings.feedLayout}
            articleLayout={settings.articleLayout}
            pagesLayout={settings.pagesLayout}
            portalWidth={settings.portalWidth ?? "default"}
            feedPageSize={settings.feedPageSize ?? 15}
            feedCardStyle={settings.feedCardStyle ?? "preview"}
            enabledModules={enabledModules}
          />
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Sidebar widgets
          </h2>
          <SidebarWidgetsForm
            rightOrder={rightOrder}
            leftOrder={leftOrder}
            enabledModules={enabledModules}
          />
        </section>
      </div>
    </div>
  )
}
