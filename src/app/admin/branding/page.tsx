import { getSettings } from "@/lib/settings"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { BrandingForm } from "@/components/branding-form"

export const metadata = { title: "Branding" }

export default async function BrandingPage() {
  await requireRole("ADMIN")
  const settings = await getSettings()

  return (
    <div className="max-w-2xl">
      <PageHeader title="Branding" description="The portal name and logo." />
      <BrandingForm
        siteName={settings.siteName}
        logoUrl={settings.logoUrl}
        logoOnLightUrl={settings.logoOnLightUrl}
        primaryColor={settings.primaryColor}
      />
    </div>
  )
}
