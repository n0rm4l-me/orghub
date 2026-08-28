import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { MODULES, parseModules, type ModuleId } from "@/lib/modules"
import { ModuleToggle } from "@/components/module-toggle"
import { KudosSettingsForm } from "@/components/kudos-settings-form"
import { KudosRedeemTypesPanel } from "@/components/kudos-redeem-types-panel"
import { TranslationSettingsForm } from "@/components/translation-settings-form"
import { getRedeemTypes } from "@/lib/actions/kudos"

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
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/modules"
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-gray-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Modules
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">{mod.label}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{mod.description}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable module</p>
              <p className="mt-0.5 text-xs text-gray-500">
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
        </div>

        {mod.id === "pages" && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Content</h2>
            <p className="mb-4 text-xs leading-relaxed text-gray-500">
              Manage your wiki pages, set parent/child relationships, and control which pages
              appear in the navigation.
            </p>
            <Link
              href="/admin/pages"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white
                px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300
                hover:bg-gray-50"
            >
              <ExternalLink className="size-3.5 text-gray-400" aria-hidden />
              Manage pages
            </Link>
          </div>
        )}

        {mod.id === "events" && (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Content</h2>
            <p className="mb-4 text-xs leading-relaxed text-gray-500">
              Events are articles with an event date attached. They appear on the calendar and in the
              upcoming events sidebar widget.
            </p>
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white
                px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300
                hover:bg-gray-50"
            >
              <ExternalLink className="size-3.5 text-gray-400" aria-hidden />
              Manage events
            </Link>
          </div>
        )}

        {mod.id === "translation" && (
          <TranslationSettingsForm
            provider={settings.translationProvider}
            languages={settings.translationLanguages}
          />
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
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">History</h2>
              <p className="mb-4 text-xs leading-relaxed text-gray-500">
                Browse all kudos sent across the portal. Admins can delete individual entries.
              </p>
              <Link
                href="/admin/kudos"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white
                  px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300
                  hover:bg-gray-50"
              >
                <ExternalLink className="size-3.5 text-gray-400" aria-hidden />
                View kudos log
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
