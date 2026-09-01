import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Building2, Coffee, ChefHat, Utensils } from "lucide-react"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { PortalPageLayout } from "@/components/portal-page-layout"

export const metadata = { title: "Dining" }

const VENUE_TYPE_ICON: Record<string, React.ElementType> = {
  CAFETERIA:  Building2,
  CAFE:       Coffee,
  RESTAURANT: ChefHat,
}

export default async function DiningIndexPage() {
  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("dining")) notFound()

  const venues = await db.venue.findMany({
    orderBy: [{ location: { name: "asc" } }, { name: "asc" }],
    include: { location: { select: { name: true } } },
  })

  if (venues.length === 1) redirect(`/dining/${venues[0].id}`)

  const layout = settings.diningLayout ?? "content"

  return (
    <PortalPageLayout
      layout={layout}
      sidebarOrder={settings.sidebarOrder}
      leftSidebarOrder={settings.leftSidebarOrder}
      eventsEnabled={enabled.has("events")}
      kudosEnabled={enabled.has("kudos")}
      gravatarsEnabled={settings.gravatarsEnabled}
    >
      <div>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Dining</h1>

        {venues.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
            <Utensils className="size-8 text-gray-300 dark:text-gray-600" aria-hidden />
            <p className="text-sm text-gray-500 dark:text-gray-400">No dining venues available.</p>
          </div>
        ) : (() => {
          // Group by location, preserving sort order
          const grouped = new Map<string, { locationName: string; venues: typeof venues }>()
          for (const v of venues) {
            const key = v.location.name
            if (!grouped.has(key)) grouped.set(key, { locationName: key, venues: [] })
            grouped.get(key)!.venues.push(v)
          }
          const groups = [...grouped.values()]
          return (
            <div className="space-y-8">
              {groups.map(({ locationName, venues: group }) => (
                <div key={locationName}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {locationName}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.map((v) => {
                      const Icon = VENUE_TYPE_ICON[v.venueType] ?? Utensils
                      return (
                        <Link
                          key={v.id}
                          href={`/dining/${v.id}`}
                          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
                        >
                          <div className="grid size-10 place-items-center rounded-lg bg-brand/10">
                            <Icon className="size-5 text-brand" aria-hidden />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{v.name}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </PortalPageLayout>
  )
}
