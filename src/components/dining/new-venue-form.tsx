"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Building2, Coffee, ChefHat } from "lucide-react"
import { createVenue } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { inputClass } from "@/components/ui/field"

type Location = { id: string; name: string }
type VenueType = "CAFETERIA" | "CAFE" | "RESTAURANT"

const VENUE_TYPES: { key: VenueType; label: string; description: string; icon: React.ElementType }[] = [
  { key: "CAFETERIA", label: "Cafeteria",   description: "Weekly rotation, meal slots, nutrition focus", icon: Building2 },
  { key: "CAFE",      label: "Café",        description: "Fixed menu, drinks with modifiers, prices",    icon: Coffee    },
  { key: "RESTAURANT",label: "Restaurant",  description: "Full à la carte, sections, premium UX",        icon: ChefHat   },
]

const lbl = "mb-1 block text-xs font-medium text-gray-700"

export function NewVenueForm({ locations, defaultLocationId }: { locations: Location[]; defaultLocationId?: string }) {
  const router = useRouter()
  const [venueType, setVenueType] = useState<VenueType>("CAFETERIA")
  const [weeklyMenuEnabled, setWeeklyMenuEnabled] = useState(true)
  const [topicsEnabled, setTopicsEnabled] = useState(true)
  const [pending, start] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("weeklyMenuEnabled", String(weeklyMenuEnabled))
    fd.set("topicsEnabled", String(topicsEnabled))
    fd.set("venueType", venueType)
    start(async () => {
      const res = await createVenue(fd)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Venue created.")
      router.push("/admin/dining")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white px-5 py-5">
      <div>
        <label className={lbl}>Location *</label>
        <select name="locationId" defaultValue={defaultLocationId ?? ""} required className={inputClass}>
          <option value="" disabled>Select location</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Name *</label>
        <input name="name" required placeholder="1st Floor Cafeteria" className={inputClass} />
      </div>

      <div>
        <p className={lbl}>Venue type</p>
        <div className="grid grid-cols-3 gap-2">
          {VENUE_TYPES.map((t) => {
            const Icon = t.icon
            const active = venueType === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setVenueType(t.key)}
                className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition ${
                  active
                    ? "border-brand bg-brand/5"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon className={`size-5 ${active ? "text-brand" : "text-gray-400"}`} />
                <span className={`text-sm font-semibold ${active ? "text-brand" : "text-gray-700"}`}>
                  {t.label}
                </span>
                <span className="text-[11px] leading-tight text-gray-400">{t.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-gray-700">Weekly menu</span>
          <button type="button" role="switch" aria-checked={weeklyMenuEnabled} onClick={() => setWeeklyMenuEnabled(!weeklyMenuEnabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${weeklyMenuEnabled ? "bg-brand" : "bg-gray-200"}`}>
            <span className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform ${weeklyMenuEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-gray-700">Announcements</span>
          <button type="button" role="switch" aria-checked={topicsEnabled} onClick={() => setTopicsEnabled(!topicsEnabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${topicsEnabled ? "bg-brand" : "bg-gray-200"}`}>
            <span className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform ${topicsEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.push("/admin/dining")}
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Create
        </button>
      </div>
    </form>
  )
}
