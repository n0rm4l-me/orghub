"use client"

import { useState, useTransition, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createLocation, updateLocation, deleteLocation } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { inputClass } from "@/components/ui/field"

type Location = { id: string; name: string; timezone: string }

interface Props {
  location?: Location
  trigger: ReactNode
}

const lbl = "mb-1 block text-xs font-medium text-gray-700"

const ALL_TIMEZONES: string[] = (() => {
  try {
    return (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? []
  } catch {
    return []
  }
})()

const FALLBACK_TIMEZONES = [
  "Pacific/Honolulu","America/Los_Angeles","America/Denver","America/Chicago","America/New_York",
  "America/Sao_Paulo","UTC","Europe/London","Europe/Paris","Europe/Berlin","Europe/Moscow",
  "Asia/Dubai","Asia/Kolkata","Asia/Bangkok","Asia/Singapore","America/New_York",
  "Australia/Sydney","Pacific/Auckland",
]

const TIMEZONES = ALL_TIMEZONES.length > 0 ? ALL_TIMEZONES : FALLBACK_TIMEZONES

export function LocationForm({ location, trigger }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [pending, start] = useTransition()
  const [tzQuery, setTzQuery] = useState(location?.timezone ?? "America/New_York")
  const [tzOpen, setTzOpen] = useState(false)
  const tzContainerRef = useRef<HTMLDivElement>(null)
  const tzInputRef = useRef<HTMLInputElement>(null)

  function handleClose() { setOpen(false); setConfirmingDelete(false); setTzOpen(false) }

  function handleOpen() {
    setTzQuery(location?.timezone ?? "America/New_York")
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("timezone", tzQuery.trim() || "UTC")
    start(async () => {
      const res = location ? await updateLocation(location.id, fd) : await createLocation(fd)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Saved.")
      handleClose()
      router.refresh()
    })
  }

  function handleDeleteClick() {
    if (!confirmingDelete) { setConfirmingDelete(true); return }
    if (!location) return
    start(async () => {
      const res = await deleteLocation(location.id)
      if (!res.ok) { toast.error(res.error); setConfirmingDelete(false); return }
      toast.success(res.message ?? "Deleted.")
      router.refresh()
    })
  }

  const filtered = TIMEZONES.filter((tz) =>
    tz.toLowerCase().includes(tzQuery.toLowerCase())
  ).slice(0, 120)

  return (
    <>
      <span onClick={handleOpen}>{trigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              {location ? "Edit location" : "New location"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={lbl}>Name *</label>
                <input name="name" defaultValue={location?.name} placeholder="Chicago Office" required className={inputClass} />
              </div>
              <div>
                <label className={lbl}>Timezone</label>
                <div ref={tzContainerRef} className="relative">
                  <input
                    ref={tzInputRef}
                    name="timezone"
                    value={tzQuery}
                    onChange={(e) => { setTzQuery(e.target.value); setTzOpen(true) }}
                    onFocus={() => setTzOpen(true)}
                    onBlur={() => setTimeout(() => setTzOpen(false), 150)}
                    placeholder="America/New_York"
                    className={inputClass}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {tzOpen && filtered.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {filtered.map((tz) => (
                        <button
                          key={tz}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setTzQuery(tz); setTzOpen(false) }}
                          className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${tzQuery === tz ? "bg-brand/5 font-medium text-brand" : "text-gray-700"}`}
                        >
                          {tz}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex gap-2">
                  <button type="submit" disabled={pending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:brightness-95 disabled:opacity-60"
                  >
                    {pending && <Loader2 className="size-3 animate-spin" />}
                    {location ? "Save" : "Create"}
                  </button>
                  <button type="button" onClick={handleClose}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
                {location && (
                  confirmingDelete ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={handleDeleteClick} disabled={pending}
                        className="inline-flex items-center rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Confirm delete
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(false)}
                        className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleDeleteClick} disabled={pending}
                      className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
