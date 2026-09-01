"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { upsertMealSlots } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"

type MealSlot = { id?: string; name: string; timeStart: string; timeEnd: string; order: number }

const inputCls = "rounded-lg border border-gray-200 px-3 py-2 text-base sm:text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"

export function MealSlotsEditor({
  venueId,
  initialSlots,
}: {
  venueId: string
  initialSlots: { id: string; name: string; timeStart: string | null; timeEnd: string | null; order: number }[]
}) {
  const router = useRouter()
  const [slots, setSlots] = useState<MealSlot[]>(
    initialSlots.map((s) => ({ ...s, timeStart: s.timeStart ?? "", timeEnd: s.timeEnd ?? "" }))
  )
  const [pending, start] = useTransition()

  function update(i: number, patch: Partial<MealSlot>) {
    setSlots((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  function addRow() {
    setSlots((ss) => [...ss, { name: "", timeStart: "", timeEnd: "", order: ss.length }])
  }

  function removeRow(i: number) {
    setSlots((ss) => ss.filter((_, j) => j !== i).map((s, j) => ({ ...s, order: j })))
  }

  function moveRow(i: number, dir: "up" | "down") {
    const j = dir === "up" ? i - 1 : i + 1
    if (j < 0 || j >= slots.length) return
    setSlots((ss) => {
      const next = [...ss]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next.map((s, k) => ({ ...s, order: k }))
    })
  }

  function handleSave() {
    for (const s of slots) {
      if (!s.name.trim()) { toast.error("All slots need a name."); return }
    }
    start(async () => {
      const res = await upsertMealSlots(venueId, slots.map((s) => ({
        ...s,
        timeStart: s.timeStart || null,
        timeEnd: s.timeEnd || null,
      })))
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Saved.")
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Meal slots</h2>
        <p className="text-xs text-gray-400">Custom meal periods (replaces Breakfast/Lunch/Dinner)</p>
      </div>

      {slots.length === 0 && <p className="mb-4 text-sm text-gray-400">No slots yet.</p>}

      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveRow(i, "up")} disabled={i === 0}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" onClick={() => moveRow(i, "down")} disabled={i === slots.length - 1}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                <ChevronDown className="size-3.5" />
              </button>
            </div>
            <input
              value={slot.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Slot name"
              className={inputCls + " flex-1"}
            />
            <input
              value={slot.timeStart}
              onChange={(e) => update(i, { timeStart: e.target.value })}
              placeholder="07:30"
              className={inputCls + " w-20"}
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              value={slot.timeEnd}
              onChange={(e) => update(i, { timeEnd: e.target.value })}
              placeholder="08:30"
              className={inputCls + " w-20"}
            />
            <button type="button" onClick={() => removeRow(i)}
              className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={addRow}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:brightness-90">
          <Plus className="size-4" aria-hidden />
          Add slot
        </button>
        <button type="button" onClick={handleSave} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save slots
        </button>
      </div>
    </div>
  )
}
