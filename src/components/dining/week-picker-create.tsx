"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, X, CalendarDays, UtensilsCrossed } from "lucide-react"
import { createWeekMenu } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"

type MenuType = "WEEKLY" | "FIXED"

const TYPES: { key: MenuType; label: string; description: string; icon: React.ElementType }[] = [
  { key: "WEEKLY", label: "Weekly", description: "Changes every week — canteen, cafeteria", icon: CalendarDays },
  { key: "FIXED", label: "Fixed", description: "Permanent — restaurant, café, kiosk", icon: UtensilsCrossed },
]

export function WeekPickerCreate({ venueId }: { venueId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [menuType, setMenuType] = useState<MenuType>("WEEKLY")
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName("")
      setMenuType("WEEKLY")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) { inputRef.current?.focus(); return }
    start(async () => {
      const res = await createWeekMenu(venueId, trimmed, menuType)
      if (!res.ok) { toast.error(res.error); return }
      setOpen(false)
      if (res.data) router.push(`/admin/dining/venues/${venueId}/menus/${res.data.id}`)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:brightness-95"
      >
        <Plus className="size-4" aria-hidden />
        Create menu
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-left dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">New menu</h2>
              <button
                onClick={() => !pending && setOpen(false)}
                className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. September menu, Lunch week 37…"
                  disabled={pending}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map((t) => {
                    const Icon = t.icon
                    const active = menuType === t.key
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setMenuType(t.key)}
                        disabled={pending}
                        className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition disabled:opacity-60 ${
                          active
                            ? "border-brand bg-brand/5 dark:bg-brand/10"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800/60"
                        }`}
                      >
                        <Icon className={`size-5 ${active ? "text-brand" : "text-gray-400"}`} />
                        <span className={`text-sm font-semibold ${active ? "text-brand" : "text-gray-700 dark:text-gray-200"}`}>
                          {t.label}
                        </span>
                        <span className="text-[11px] leading-tight text-gray-400 dark:text-gray-500">
                          {t.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={pending || !name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
