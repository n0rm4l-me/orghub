import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { getSettings } from "@/lib/settings"
import { MODULES, parseModules, type ModuleId } from "@/lib/modules"
import { ModuleToggle } from "@/components/module-toggle"
import { KudosSettingsForm } from "@/components/kudos-settings-form"
import { KudosRedeemTypesPanel } from "@/components/kudos-redeem-types-panel"
import { TranslationSettingsForm } from "@/components/translation-settings-form"
import { DiningSettingsForm } from "@/components/dining/dining-settings-form"
import { getRedeemTypes } from "@/lib/actions/kudos"
import { Panel } from "@/components/ui/field"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const mod = MODULES[id as ModuleId]
  return { title: mod ? `${mod.label} settings` : "Module" }
}

export default async function ModuleSettingsPage({ params }: Props) {
  const { id } = await params
  await requireRole("ADMIN")

  const mod = MODULES[id as ModuleId]
  if (!mod) notFound()

  const [settings, redeemTypes] = await Promise.all([
    getSettings(),
    mod.id === "kudos" ? getRedeemTypes() : Promise.resolve([]),
  ])
  const enabled = parseModules(settings.enabledModules)

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={mod.label}
        description={mod.description}
        back={{ href: "/admin/modules", label: "Modules" }}
      />

      <div className="space-y-4">
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable module</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {enabled.has(mod.id)
                  ? `${mod.label} is currently active.`
                  : `${mod.label} is currently disabled site-wide.`}
              </p>
            </div>
            <ModuleToggle
              moduleId={mod.id}
              initialEnabled={enabled.has(mod.id)}
              allEnabled={[...enabled]}
            />
          </div>
        </Panel>

        {mod.id === "pages" && (
          <Panel title="Content">
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Manage your wiki pages, set parent/child relationships, and control which pages
              appear in the navigation.
            </p>
            <Link
              href="/admin/pages"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card
                px-3 py-2 text-sm font-medium text-foreground transition hover:border-muted-foreground/40
                hover:bg-muted"
            >
              <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
              Manage pages
            </Link>
          </Panel>
        )}

        {mod.id === "events" && (
          <Panel title="Content">
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Events are articles with an event date attached. They appear on the calendar and in the
              upcoming events sidebar widget.
            </p>
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card
                px-3 py-2 text-sm font-medium text-foreground transition hover:border-muted-foreground/40
                hover:bg-muted"
            >
              <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
              Manage events
            </Link>
          </Panel>
        )}

        {mod.id === "translation" && (
          <TranslationSettingsForm
            provider={settings.translationProvider}
            languages={settings.translationLanguages}
          />
        )}

        {mod.id === "dining" && (
          <>
            <DiningSettingsForm currency={settings.diningCurrency} />
            <Panel title="Content">
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                Manage locations, venues, weekly menus, dish library, and monthly topics.
              </p>
              <Link
                href="/admin/dining"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card
                  px-3 py-2 text-sm font-medium text-foreground transition hover:border-muted-foreground/40
                  hover:bg-muted"
              >
                <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                Manage dining
              </Link>
            </Panel>
          </>
        )}

        {mod.id === "kudos" && (
          <>
            <KudosSettingsForm
              monthlyBudget={settings.kudosMonthlyBudget}
              values={settings.kudosValues}
              redeemEnabled={settings.kudosRedeemEnabled}
              redeemWebhook={settings.kudosRedeemWebhook ?? ""}
              redeemRateLabel={settings.kudosRedeemRateLabel ?? ""}
            />
            <KudosRedeemTypesPanel initialTypes={redeemTypes} />
            <Panel title="History">
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                Browse all kudos sent across the portal. Admins can delete individual entries.
              </p>
              <Link
                href="/admin/kudos"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card
                  px-3 py-2 text-sm font-medium text-foreground transition hover:border-muted-foreground/40
                  hover:bg-muted"
              >
                <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                View kudos log
              </Link>
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
