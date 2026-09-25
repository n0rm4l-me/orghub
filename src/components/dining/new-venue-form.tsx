"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Building2, Coffee, ChefHat } from "lucide-react"
import { createVenue } from "@/lib/actions/dining"
import { useAction } from "@/lib/use-action"
import { inputClass, compactLabelClass as lbl } from "@/components/ui/field"

type Location = { id: string; name: string }
type VenueType = "CAFETERIA" | "CAFE" | "RESTAURANT"

const VENUE_TYPES: { key: VenueType; label: string; description: string; icon: React.ElementType }[] = [
  { key: "CAFETERIA", label: "Cafeteria",   description: "Weekly rotation, meal slots, nutrition focus", icon: Building2 },
  { key: "CAFE",      label: "Café",        description: "Fixed menu, drinks with modifiers, prices",    icon: Coffee    },
  { key: "RESTAURANT",label: "Restaurant",  description: "Full à la carte, sections, premium UX",        icon: ChefHat   },
]


export function NewVenueForm({ locations, defaultLocationId }: { locations: Location[]; defaultLocationId?: string }) {
  const router = useRouter()
  const [venueType, setVenueType] = useState<VenueType>("CAFETERIA")
  const [weeklyMenuEnabled, setWeeklyMenuEnabled] = useState(true)
  const [topicsEnabled, setTopicsEnabled] = useState(true)

  const { run, pending } = useAction(createVenue, {
    onSuccess: () => { router.push("/admin/dining"); router.refresh() },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("weeklyMenuEnabled", String(weeklyMenuEnabled))
    fd.set("topicsEnabled", String(topicsEnabled))
    fd.set("venueType", venueType)
    run(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card px-5 py-5">
      <div>
        <label className={lbl}>Location <span aria-hidden="true">*</span></label>
        <select name="locationId" defaultValue={defaultLocationId ?? ""} required className={inputClass}>
          <option value="" disabled>Select location</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Name <span aria-hidden="true">*</span></label>
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
                    ? "border-brand bg-brand/5 dark:bg-brand/10"
                    : "border-border hover:border-border hover:bg-muted"
                }`}
              >
                <Icon className={`size-5 ${active ? "text-brand" : "text-muted-foreground"}`} />
                <span className={`text-sm font-semibold ${active ? "text-brand" : "text-foreground"}`}>
                  {t.label}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">{t.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg bg-muted px-4 py-3 space-y-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-foreground">Weekly menu</span>
          <button type="button" role="switch" aria-checked={weeklyMenuEnabled} onClick={() => setWeeklyMenuEnabled(!weeklyMenuEnabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${weeklyMenuEnabled ? "bg-brand" : "bg-border"}`}>
            <span className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform ${weeklyMenuEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-foreground">Announcements</span>
          <button type="button" role="switch" aria-checked={topicsEnabled} onClick={() => setTopicsEnabled(!topicsEnabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${topicsEnabled ? "bg-brand" : "bg-border"}`}>
            <span className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform ${topicsEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => router.push("/admin/dining")}
          className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
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
