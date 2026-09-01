import Link from "next/link"
import { Plus, MapPin, Building2, Coffee, ChefHat, Utensils } from "lucide-react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { scopedLocationId } from "@/lib/dining-scope"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { LocationForm } from "@/components/dining/location-form"
import { AddVenueDialog } from "@/components/dining/add-venue-dialog"

export const metadata = { title: "Dining" }

const VENUE_TYPE_META: Record<string, { icon: React.ElementType; label: string; badgeCls: string; iconCls: string }> = {
  CAFETERIA:  { icon: Building2, label: "Cafeteria",  badgeCls: "bg-sky-50 text-sky-700",     iconCls: "text-sky-400"    },
  CAFE:       { icon: Coffee,    label: "Café",        badgeCls: "bg-amber-50 text-amber-700", iconCls: "text-amber-400"  },
  RESTAURANT: { icon: ChefHat,   label: "Restaurant",  badgeCls: "bg-rose-50 text-rose-700",   iconCls: "text-rose-400"   },
}

function venueTypeMeta(t?: string | null) {
  return VENUE_TYPE_META[t ?? ""] ?? { icon: Utensils, label: "Venue", badgeCls: "bg-gray-100 text-gray-500", iconCls: "text-gray-300" }
}

export default async function DiningPage() {
  const user = await requireRole("EDITOR")

  const onlyLocation = await scopedLocationId(user.id, user.role)

  const locations = await db.location.findMany({
    where: onlyLocation === null ? {} : { id: onlyLocation },
    orderBy: { name: "asc" },
    include: {
      venues: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, venueType: true },
      },
    },
  })

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Dining"
        description={`${locations.length} location${locations.length === 1 ? "" : "s"}`}
        action={
          user.role === "ADMIN" ? (
            <LocationForm trigger={
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:brightness-95">
                <Plus className="size-4" aria-hidden />
                Add location
              </button>
            } />
          ) : undefined
        }
      />

      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations yet" description="Add a location to start managing dining venues." />
      ) : (
        <div className="space-y-6">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <p className="font-medium text-gray-900">{loc.name}</p>
                  <p className="text-xs text-gray-400">{loc.timezone}</p>
                </div>
                {user.role === "ADMIN" && (
                  <div className="flex items-center gap-2">
                    <LocationForm
                      location={loc}
                      trigger={
                        <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                          Edit
                        </button>
                      }
                    />
                    <AddVenueDialog locationId={loc.id} />
                  </div>
                )}
              </div>
              {loc.venues.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No venues yet.</p>
              ) : (
                <div className="divide-y divide-gray-50 overflow-hidden">
                  {loc.venues.map((v) => {
                    const meta = venueTypeMeta(v.venueType)
                    const Icon = meta.icon
                    return (
                      <Link
                        key={v.id}
                        href={`/admin/dining/venues/${v.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition hover:bg-gray-50 last:rounded-b-xl"
                      >
                        <Icon className={`size-4 shrink-0 ${meta.iconCls}`} aria-hidden />
                        <span className="flex-1 text-sm text-gray-800">{v.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badgeCls}`}>
                          {meta.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
