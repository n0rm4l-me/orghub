import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { PageHeader } from "@/components/ui/page-header"
import { MODULES, parseModules } from "@/lib/modules"

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
          <Link
            key={mod.id}
            href={`/admin/modules/${mod.id}`}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4
              transition hover:border-gray-300 hover:shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{mod.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{mod.description}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                enabled.has(mod.id)
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {enabled.has(mod.id) ? "Enabled" : "Disabled"}
            </span>
            <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
          </Link>
        ))}

      </div>
    </div>
  )
}
