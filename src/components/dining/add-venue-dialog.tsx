"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Building2, Coffee, ChefHat } from "lucide-react"
import { createVenue } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { inputClass } from "@/components/ui/field"

type VenueType = "CAFETERIA" | "CAFE" | "RESTAURANT"

const VENUE_TYPES: { key: VenueType; label: string; description: string; icon: React.ElementType }[] = [
  { key: "CAFETERIA",  label: "Cafeteria",  description: "Weekly rotation, meal slots", icon: Building2 },
  { key: "CAFE",       label: "Café",        description: "Fixed menu, modifiers, prices", icon: Coffee   },
  { key: "RESTAURANT", label: "Restaurant",  description: "À la carte, sections",         icon: ChefHat  },
]

export function AddVenueDialog({ locationId }: { locationId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [venueType, setVenueType] = useState<VenueType>("CAFETERIA")
  const [pending, start] = useTransition()

  function handleClose() { setOpen(false); setVenueType("CAFETERIA") }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("locationId", locationId)
    fd.set("venueType", venueType)
    fd.set("weeklyMenuEnabled", "true")
    fd.set("topicsEnabled", "true")
    start(async () => {
      const res = await createVenue(fd)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Venue created.")
      handleClose()
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <Plus className="size-3.5" aria-hidden />
        Add venue
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">New venue</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input name="name" required placeholder="9F Cafeteria" autoFocus className={inputClass} />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">Venue type</p>
                <div className="grid grid-cols-3 gap-2">
                  {VENUE_TYPES.map((t) => {
                    const Icon = t.icon
                    const active = venueType === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setVenueType(t.key)}
                        className={`flex flex-col items-start gap-1 rounded-xl border-2 p-2.5 text-left transition ${
                          active
                            ? "border-brand bg-brand/5 dark:bg-brand/10"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/60"
                        }`}
                      >
                        <Icon className={`size-4 ${active ? "text-brand" : "text-gray-400"}`} />
                        <span className={`text-xs font-semibold leading-tight ${active ? "text-brand" : "text-gray-700 dark:text-gray-200"}`}>
                          {t.label}
                        </span>
                        <span className="text-[10px] leading-tight text-gray-400 dark:text-gray-500">{t.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={handleClose}
                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">
                  Cancel
                </button>
                <button type="submit" disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:brightness-95 disabled:opacity-60">
                  {pending && <Loader2 className="size-3 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
