"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Building2, Coffee, ChefHat, Trash2 } from "lucide-react"
import { updateVenue, deleteVenue } from "@/lib/actions/dining"
import { useAction } from "@/lib/use-action"
import { inputClass, compactLabelClass as lbl } from "@/components/ui/field"

type Venue = {
  id: string
  name: string
  venueType: string
}

type VenueType = "CAFETERIA" | "CAFE" | "RESTAURANT"

const VENUE_TYPES: {
  key: VenueType
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    key: "CAFETERIA",
    label: "Cafeteria",
    description: "Weekly rotation, meal slots, nutrition focus",
    icon: Building2,
  },
  {
    key: "CAFE",
    label: "Café",
    description: "Fixed menu, drinks with modifiers, prices",
    icon: Coffee,
  },
  {
    key: "RESTAURANT",
    label: "Restaurant",
    description: "Full à la carte, sections, premium UX",
    icon: ChefHat,
  },
]


export function VenueSettingsForm({ venue }: { venue: Venue }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [venueType, setVenueType] = useState<VenueType>((venue.venueType as VenueType) ?? "CAFETERIA")

  const { run, pending } = useAction(
    (fd: FormData) => updateVenue(venue.id, fd),
    { onSuccess: () => router.refresh() }
  )

  const { run: runDelete, pending: deleting } = useAction(
    () => deleteVenue(venue.id),
    { onSuccess: () => router.push("/admin/dining") }
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("venueType", venueType)
    run(fd)
  }

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Venue settings</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={lbl}>Name <span aria-hidden="true">*</span></label>
          <input name="name" defaultValue={venue.name} required className={inputClass} />
        </div>

        {/* Venue type */}
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
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    {t.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="size-3.5" />
            Delete venue
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </button>
        </div>

        {deleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]" onClick={() => setDeleteOpen(false)}>
            <div className="w-full max-w-sm rounded-xl bg-popover p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Delete venue?</h2>
              <p className="mb-5 text-sm text-muted-foreground">
                This will permanently delete <span className="font-medium text-foreground">{venue.name}</span> and all its menus, dishes, and settings.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
                  Cancel
                </button>
                <button type="button" disabled={deleting}
                  onClick={() => runDelete()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                  {deleting && <Loader2 className="size-3.5 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
