"use client"

import { useReducer, useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff, Ban } from "lucide-react"
import { saveWeekMenuEntries, publishWeekMenu, unpublishWeekMenu, saveClosedDays, updateWeekMenuName } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { WeekMenuCell } from "@/components/dining/week-menu-cell"
import type { DayOfWeek } from "@prisma/client"

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
]


type MealSlot = { id: string; name: string; order: number }
type Category = { id: string; name: string; mealSlotId: string; order: number }
type NutritionParam = { id: string; name: string; unit: string; featured: boolean }
type VenueTag = { id: string; name: string; color: string; bgColor: string }

type EntryData = {
  id?: string
  dishId?: string | null
  name?: string | null
  description?: string | null
  photo?: string | null
  nutrition?: Record<string, number | null> | null
  tagIds?: string
  note?: string | null
}

type State = Map<string, EntryData>

function entryKey(day: DayOfWeek, mealSlotId: string, categoryId: string) {
  return `${day}:${mealSlotId}:${categoryId}`
}

type Action =
  | { type: "SET"; day: DayOfWeek; mealSlotId: string; categoryId: string; data: EntryData }
  | { type: "CLEAR"; day: DayOfWeek; mealSlotId: string; categoryId: string }

function reducer(state: State, action: Action): State {
  const next = new Map(state)
  const key = entryKey(action.day, action.mealSlotId, action.categoryId)
  if (action.type === "SET") next.set(key, action.data)
  else next.delete(key)
  return next
}

type RawEntry = {
  id: string; day: DayOfWeek; mealSlotId: string; categoryId: string
  dishId: string | null; name: string | null; description: string | null; photo: string | null
  nutrition: unknown; tagIds: string; note: string | null
  dish: { name: string; description: string | null; photo: string | null } | null
}

function buildInitialState(entries: RawEntry[]): State {
  const map = new Map<string, EntryData>()
  for (const e of entries) {
    map.set(entryKey(e.day, e.mealSlotId, e.categoryId), {
      id: e.id, dishId: e.dishId, name: e.name, description: e.description, photo: e.photo,
      nutrition: e.nutrition as Record<string, number | null> | null,
      tagIds: e.tagIds, note: e.note,
    })
  }
  return map
}

interface Props {
  menuId: string
  venueId: string
  menuName: string | null
  mealSlots: MealSlot[]
  categories: Category[]
  nutritionParams: NutritionParam[]
  venueTags: VenueTag[]
  initialEntries: RawEntry[]
  publishedAt: string | null
  initialClosedDays: string[]
}

export function WeekMenuGrid({
  menuId, venueId, menuName, mealSlots, categories, nutritionParams, venueTags,
  initialEntries, publishedAt, initialClosedDays,
}: Props) {
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, buildInitialState(initialEntries))
  const [closedSlots, setClosedSlots] = useState<Set<string>>(new Set(initialClosedDays))
  const [activeDay, setActiveDay] = useState<DayOfWeek>("MON")
  const [name, setName] = useState(menuName ?? "")
  const [savedName, setSavedName] = useState(menuName ?? "")
  const [savePending, startSave] = useTransition()
  const [publishPending, startPublish] = useTransition()
  const [closedPending, startClosed] = useTransition()
  const [namePending, startName] = useTransition()

  function isDayClosed(day: DayOfWeek) { return closedSlots.has(day) }

  function toggleSlot(slot: string) {
    const next = new Set(closedSlots)
    if (next.has(slot)) {
      next.delete(slot)
    } else {
      next.add(slot)
      if (!slot.includes(":")) {
        for (const s of mealSlots) next.delete(`${slot}:${s.id}`)
      }
    }
    setClosedSlots(next)
    startClosed(async () => { await saveClosedDays(menuId, [...next]) })
  }

  function handleNameBlur() {
    const trimmed = name.trim() || null
    if (trimmed === savedName) return
    startName(async () => {
      const res = await updateWeekMenuName(menuId, trimmed)
      if (!res.ok) { toast.error(res.error); return }
      setSavedName(trimmed ?? "")
    })
  }

  function handleSave() {
    if (!name.trim()) { toast.error("Menu name is required."); return }
    startSave(async () => {
      const slotJobs = mealSlots
        .map((slot) => {
          const slotCats = categories.filter((c) => c.mealSlotId === slot.id)
          if (slotCats.length === 0) return null
          const entries = slotCats.flatMap((cat) =>
            DAYS.map((d) => {
              const data = state.get(entryKey(d.key, slot.id, cat.id))
              if (!data) return null
              return { day: d.key, mealSlotId: slot.id, categoryId: cat.id, ...data }
            }).filter(Boolean)
          ) as Parameters<typeof saveWeekMenuEntries>[2]
          return saveWeekMenuEntries(menuId, slot.id, entries)
        })
        .filter(Boolean)

      const results = await Promise.all(slotJobs)
      const failed = results.find((r) => r && !r.ok)
      if (failed && !failed.ok) { toast.error(failed.error); return }
      toast.success("Saved.")
      router.refresh()
    })
  }

  function handlePublishToggle() {
    startPublish(async () => {
      const res = publishedAt ? await unpublishWeekMenu(menuId) : await publishWeekMenu(menuId)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Done.")
      router.refresh()
    })
  }

  const dayClosed = isDayClosed(activeDay)

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="Menu name…"
            disabled={namePending}
            className={`w-64 rounded-lg border px-2 py-0.5 text-lg font-semibold text-gray-900 outline-none hover:border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60 ${
              !name.trim() ? "border-red-300" : "border-transparent"
            }`}
          />
          {!name.trim() && (
            <span className="text-xs text-red-400">Required</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublishToggle}
            disabled={publishPending}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60
              ${publishedAt ? "border-gray-200 text-gray-600 hover:bg-gray-50" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
          >
            {publishPending ? <Loader2 className="size-3.5 animate-spin" /> : publishedAt ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {publishedAt ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={handleSave}
            disabled={savePending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60"
          >
            {savePending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" role="tablist">
        <div className="flex divide-x divide-gray-100 dark:divide-gray-700">
          {DAYS.map((d, i) => (
            <button
              key={d.key}
              role="tab"
              aria-selected={d.key === activeDay}
              onClick={() => setActiveDay(d.key)}
              className={`flex-1 px-2 py-2.5 text-center transition-colors ${
                d.key === activeDay
                  ? "bg-brand/5 dark:bg-brand/10"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
              }`}
            >
              <span className={`block text-xs font-semibold ${
                d.key === activeDay ? "text-brand" : closedSlots.has(d.key) ? "text-gray-300 dark:text-gray-600" : "text-gray-600 dark:text-gray-300"
              }`}>
                {d.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active day content */}
      <div className="space-y-5">
        {/* Day off toggle */}
        <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/60">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {dayClosed ? "Day off — all slots closed" : "Working day"}
          </span>
          <button
            onClick={() => toggleSlot(activeDay)}
            disabled={closedPending}
            className={`rounded-lg border px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
              dayClosed
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            {dayClosed ? "Mark open" : "Mark as day off"}
          </button>
        </div>

        {dayClosed ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-[image:repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(220,38,38,.06)_10px,rgba(220,38,38,.06)_11px)] dark:border-gray-700">
            <span className="inline-flex items-center gap-1.5 rounded bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-red-400 dark:bg-gray-900/80 dark:text-red-500">
              <Ban className="size-3.5" aria-hidden />
              Day off
            </span>
          </div>
        ) : (
          mealSlots.map((slot) => {
            const slotCats = categories.filter((c) => c.mealSlotId === slot.id)
            if (slotCats.length === 0) return null
            const slotClosed = closedSlots.has(`${activeDay}:${slot.id}`)

            return (
              <div key={slot.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {slot.name}
                  </p>
                  <button
                    onClick={() => toggleSlot(`${activeDay}:${slot.id}`)}
                    disabled={closedPending}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-50 ${
                      slotClosed
                        ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {slotClosed ? "Closed" : "Open"}
                  </button>
                </div>

                {slotClosed ? (
                  <div className="flex min-h-[56px] items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-red-400">Closed</span>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
                    {slotCats.map((cat) => (
                      <div key={cat.id} className="px-4 py-3">
                        <WeekMenuCell
                          catName={cat.name}
                          venueId={venueId}
                          entry={state.get(entryKey(activeDay, slot.id, cat.id))}
                          nutritionParams={nutritionParams}
                          venueTags={venueTags}
                          onSet={(data) => dispatch({ type: "SET", day: activeDay, mealSlotId: slot.id, categoryId: cat.id, data })}
                          onClear={() => dispatch({ type: "CLEAR", day: activeDay, mealSlotId: slot.id, categoryId: cat.id })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
