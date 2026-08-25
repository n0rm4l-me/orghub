import { getSettings } from "@/lib/settings"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { ThemeForm } from "@/components/theme-form"

export const metadata = { title: "Theme" }

export default async function ThemePage() {
  await requireRole("ADMIN")
  const settings = await getSettings()

  return (
    <div className="max-w-2xl">
      <PageHeader title="Theme" description="The accent colour used across the portal." />
      <ThemeForm
        primaryColor={settings.primaryColor}
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
      />
    </div>
  )
}
