"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { upsertSlotsAndCategories } from "@/lib/actions/dining"
import { useAction } from "@/lib/use-action"
import { toast } from "@/components/ui/toaster"

type CatRow = { id?: string; name: string }
type SlotRow = { id?: string; name: string; timeStart: string; timeEnd: string; cats: CatRow[] }

const inputCls = "rounded-lg border border-border px-3 py-2 text-base sm:text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"

export function MealStructureEditor({
  venueId,
  initialSlots,
  initialCategories,
}: {
  venueId: string
  initialSlots: { id: string; name: string; timeStart: string | null; timeEnd: string | null; order: number }[]
  initialCategories: { id: string; name: string; mealSlotId: string; order: number }[]
}) {
  const router = useRouter()

  const [slots, setSlots] = useState<SlotRow[]>(() =>
    [...initialSlots].sort((a, b) => a.order - b.order).map((s) => ({
      id: s.id,
      name: s.name,
      timeStart: s.timeStart ?? "",
      timeEnd: s.timeEnd ?? "",
      cats: initialCategories
        .filter((c) => c.mealSlotId === s.id)
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: c.id, name: c.name })),
    }))
  )

  function updateSlot(i: number, patch: Partial<SlotRow>) {
    setSlots((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  function addSlot() {
    setSlots((ss) => [...ss, { name: "", timeStart: "", timeEnd: "", cats: [] }])
  }

  function removeSlot(i: number) {
    setSlots((ss) => ss.filter((_, j) => j !== i))
  }

  function moveSlot(i: number, dir: "up" | "down") {
    const j = dir === "up" ? i - 1 : i + 1
    if (j < 0 || j >= slots.length) return
    setSlots((ss) => {
      const next = [...ss]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function addCat(si: number) {
    setSlots((ss) => ss.map((s, i) => i === si ? { ...s, cats: [...s.cats, { name: "" }] } : s))
  }

  function updateCat(si: number, ci: number, name: string) {
    setSlots((ss) => ss.map((s, i) => i !== si ? s : {
      ...s, cats: s.cats.map((c, j) => j === ci ? { ...c, name } : c),
    }))
  }

  function removeCat(si: number, ci: number) {
    setSlots((ss) => ss.map((s, i) => i !== si ? s : {
      ...s, cats: s.cats.filter((_, j) => j !== ci),
    }))
  }

  function moveCat(si: number, ci: number, dir: "up" | "down") {
    const j = dir === "up" ? ci - 1 : ci + 1
    setSlots((ss) => ss.map((s, i) => {
      if (i !== si) return s
      if (j < 0 || j >= s.cats.length) return s
      const next = [...s.cats]
      ;[next[ci], next[j]] = [next[j], next[ci]]
      return { ...s, cats: next }
    }))
  }

  const { run, pending } = useAction(
    (rows: SlotRow[]) =>
      upsertSlotsAndCategories(
        venueId,
        rows.map((s, i) => ({
          id: s.id,
          name: s.name.trim(),
          timeStart: s.timeStart || null,
          timeEnd: s.timeEnd || null,
          order: i,
          categories: s.cats.map((c) => ({ id: c.id, name: c.name.trim() })),
        }))
      ),
    { onSuccess: () => router.refresh() }
  )

  function handleSave() {
    for (const s of slots) {
      if (!s.name.trim()) { toast.error("All slots need a name."); return }
      for (const c of s.cats) {
        if (!c.name.trim()) { toast.error("All categories need a name."); return }
      }
    }
    run(slots)
  }

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Meal slots &amp; categories</h2>
        <p className="text-xs text-muted-foreground">Slots define time periods; categories are rows in the menu grid</p>
      </div>

      {slots.length === 0 && (
        <p className="mb-4 text-sm text-muted-foreground">No slots yet.</p>
      )}

      <div className="space-y-3">
        {slots.map((slot, si) => (
          <div key={si} className="rounded-lg border border-border bg-muted">
            {/* Slot header row */}
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveSlot(si, "up")} disabled={si === 0} aria-label="Move up"
                  className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
                  <ChevronUp className="size-3.5" />
                </button>
                <button type="button" onClick={() => moveSlot(si, "down")} disabled={si === slots.length - 1} aria-label="Move down"
                  className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              <input
                value={slot.name}
                onChange={(e) => updateSlot(si, { name: e.target.value })}
                placeholder="Slot name"
                className={inputCls + " min-w-[140px] flex-1 font-medium"}
              />
              <div className="flex items-center gap-2">
                <input
                  value={slot.timeStart}
                  onChange={(e) => updateSlot(si, { timeStart: e.target.value })}
                  placeholder="07:30"
                  className={inputCls + " w-20"}
                />
                <span className="text-xs text-muted-foreground">–</span>
                <input
                  value={slot.timeEnd}
                  onChange={(e) => updateSlot(si, { timeEnd: e.target.value })}
                  placeholder="08:30"
                  className={inputCls + " w-20"}
                />
                <button type="button" onClick={() => removeSlot(si)} aria-label="Remove slot"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Categories indented under slot */}
            {(slot.cats.length > 0 || true) && (
              <div className="border-t border-border px-3 pb-2.5 pt-2">
                <div className="space-y-1.5">
                  {slot.cats.map((cat, ci) => (
                    <div key={ci} className="flex items-center gap-2 pl-6">
                      <div className="flex flex-col gap-0.5">
                        <button type="button" onClick={() => moveCat(si, ci, "up")} disabled={ci === 0} aria-label="Move up"
                          className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
                          <ChevronUp className="size-3" />
                        </button>
                        <button type="button" onClick={() => moveCat(si, ci, "down")} disabled={ci === slot.cats.length - 1} aria-label="Move down"
                          className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
                          <ChevronDown className="size-3" />
                        </button>
                      </div>
                      <input
                        value={cat.name}
                        onChange={(e) => updateCat(si, ci, e.target.value)}
                        placeholder="Category name"
                        className={inputCls + " flex-1 text-xs py-1.5"}
                      />
                      <button type="button" onClick={() => removeCat(si, ci)} aria-label="Remove category"
                        className="shrink-0 rounded p-1 text-gray-200 hover:text-red-500 dark:text-gray-700">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addCat(si)}
                  className="mt-2 inline-flex items-center gap-1 pl-6 text-xs font-medium text-brand hover:brightness-90">
                  <Plus className="size-3.5" aria-hidden />
                  Add category
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={addSlot}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:brightness-90">
          <Plus className="size-4" aria-hidden />
          Add slot
        </button>
        <button type="button" onClick={handleSave} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  )
}
