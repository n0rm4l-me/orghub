import { getSettings } from "@/lib/settings"
import { requireRole } from "@/lib/rbac"
import { parseModules } from "@/lib/modules"
import { PageHeader } from "@/components/ui/page-header"
import { BrandForm } from "@/components/brand-form"
import { LayoutForm } from "@/components/layout-form"
import { SidebarWidgetsForm } from "@/components/sidebar-widgets-form"
import { GravatarToggle } from "@/components/gravatar-toggle"
import { Panel } from "@/components/ui/field"

export const metadata = { title: "Appearance" }

const DEFAULT_RIGHT = ["quickLinks", "browseByTopic", "upcomingEvents"]

export default async function AppearancePage() {
  await requireRole("ADMIN")
  const settings = await getSettings()
  const rightOrder = settings.sidebarOrder?.split(",").filter(Boolean) ?? DEFAULT_RIGHT
  const leftOrder  = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const enabledModules = parseModules(settings.enabledModules)

  return (
    <div className="max-w-3xl space-y-10">
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

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Layout
        </h2>
        <LayoutForm
          feedLayout={settings.feedLayout}
          articleLayout={settings.articleLayout}
          pagesLayout={settings.pagesLayout}
          eventsLayout={settings.eventsLayout ?? "content"}
          kudosLayout={settings.kudosLayout ?? "content"}
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

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Avatars
        </h2>
        <Panel>
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-gray-900">Gravatar avatars</p>
              <p className="mt-0.5 text-xs text-gray-500">
                When enabled, user photo is loaded from gravatar.com using an MD5 hash of their
                email. Disable to keep email hashes off external servers and show initials only.
              </p>
            </div>
            <GravatarToggle initialEnabled={settings.gravatarsEnabled} />
          </div>
        </Panel>
      </section>
    </div>
  )
}
