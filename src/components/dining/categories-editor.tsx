"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { upsertCategories } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { inputClass } from "@/components/ui/field"

type Category = { id?: string; name: string; mealSlotId: string; order: number }
type MealSlot = { id: string; name: string }

export function CategoriesEditor({
  venueId,
  initialCategories,
  mealSlots,
}: {
  venueId: string
  initialCategories: { id: string; name: string; mealSlotId: string; order: number }[]
  mealSlots: MealSlot[]
}) {
  const router = useRouter()
  const [bySlot, setBySlot] = useState<Record<string, Category[]>>(() => {
    const map: Record<string, Category[]> = {}
    for (const s of mealSlots) {
      map[s.id] = initialCategories
        .filter((c) => c.mealSlotId === s.id)
        .sort((a, b) => a.order - b.order)
    }
    return map
  })
  const [pending, start] = useTransition()

  function updateName(slotId: string, i: number, name: string) {
    setBySlot((prev) => ({
      ...prev,
      [slotId]: prev[slotId].map((c, j) => (j === i ? { ...c, name } : c)),
    }))
  }

  function addRow(slotId: string) {
    setBySlot((prev) => ({
      ...prev,
      [slotId]: [...(prev[slotId] ?? []), { name: "", mealSlotId: slotId, order: 0 }],
    }))
  }

  function removeRow(slotId: string, i: number) {
    setBySlot((prev) => ({
      ...prev,
      [slotId]: prev[slotId].filter((_, j) => j !== i),
    }))
  }

  function moveRow(slotId: string, i: number, dir: "up" | "down") {
    const j = dir === "up" ? i - 1 : i + 1
    const list = bySlot[slotId]
    if (!list || j < 0 || j >= list.length) return
    setBySlot((prev) => {
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...prev, [slotId]: next }
    })
  }

  function handleSave() {
    const all: Category[] = []
    let order = 0
    for (const s of mealSlots) {
      for (const c of bySlot[s.id] ?? []) {
        if (!c.name.trim()) { toast.error("All categories need a name."); return }
        all.push({ ...c, order: order++ })
      }
    }
    start(async () => {
      const res = await upsertCategories(venueId, all)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Saved.")
      router.refresh()
    })
  }

  if (mealSlots.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Meal categories</h2>
        <p className="text-sm text-gray-400">Create meal slots first, then add categories here.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Meal categories</h2>
        <p className="text-xs text-gray-400">Rows in the weekly menu grid</p>
      </div>

      <div className="space-y-5">
        {mealSlots.map((slot) => {
          const cats = bySlot[slot.id] ?? []
          return (
            <div key={slot.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{slot.name}</p>
              <div className="space-y-2">
                {cats.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveRow(slot.id, i, "up")} disabled={i === 0}
                        className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => moveRow(slot.id, i, "down")} disabled={i === cats.length - 1}
                        className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                    <input
                      value={cat.name}
                      onChange={(e) => updateName(slot.id, i, e.target.value)}
                      placeholder="Category name"
                      className={inputClass}
                    />
                    <button type="button" onClick={() => removeRow(slot.id, i)}
                      className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                {cats.length === 0 && (
                  <p className="text-xs text-gray-400">No categories yet.</p>
                )}
              </div>
              <button type="button" onClick={() => addRow(slot.id)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:brightness-90">
                <Plus className="size-3.5" aria-hidden />
                Add category
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={handleSave} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save categories
        </button>
      </div>
    </div>
  )
}
