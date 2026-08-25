import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { PageHeader } from "@/components/ui/page-header"
import { MODULES, parseModules } from "@/lib/modules"
import { ModuleToggle } from "@/components/module-toggle"

export const metadata = { title: "Modules" }

export default async function ModulesPage() {
  await requireRole("ADMIN")
  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Modules"
        description="Optional features that can be enabled or disabled for this portal."
      />

      <div className="space-y-3">
        {Object.values(MODULES).map((mod) => (
          <div
            key={mod.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-gray-200
              bg-white px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{mod.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{mod.description}</p>
            </div>
            <ModuleToggle
              moduleId={mod.id}
              initialEnabled={enabled.has(mod.id)}
              allEnabled={[...enabled]}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
