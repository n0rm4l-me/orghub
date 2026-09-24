"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { upsertNutritionParams } from "@/lib/actions/dining"
import { useAction } from "@/lib/use-action"
import { toast } from "@/components/ui/toaster"

type Param = { id?: string; name: string; unit: string; featured: boolean; order: number }

const inputCls = "rounded-lg border border-gray-200 px-3 py-2 text-base sm:text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"

export function NutritionParamsEditor({
  venueId,
  initialParams,
}: {
  venueId: string
  initialParams: { id: string; name: string; unit: string; featured: boolean; order: number }[]
}) {
  const router = useRouter()
  const [params, setParams] = useState<Param[]>(initialParams)
  const { run, pending } = useAction(
    (p: Param[]) => upsertNutritionParams(venueId, p),
    { onSuccess: () => router.refresh() }
  )

  function update(i: number, patch: Partial<Param>) {
    setParams((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  }

  function addRow() {
    setParams((ps) => [...ps, { name: "", unit: "", featured: false, order: ps.length }])
  }

  function removeRow(i: number) {
    setParams((ps) => ps.filter((_, j) => j !== i).map((p, j) => ({ ...p, order: j })))
  }

  function moveRow(i: number, dir: "up" | "down") {
    const j = dir === "up" ? i - 1 : i + 1
    if (j < 0 || j >= params.length) return
    setParams((ps) => {
      const next = [...ps]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next.map((p, k) => ({ ...p, order: k }))
    })
  }

  function handleSave() {
    for (const p of params) {
      if (!p.name.trim()) { toast.error("All params need a name."); return }
    }
    run(params)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nutrition parameters</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">Custom per-serving values shown on menu cards</p>
      </div>

      {params.length === 0 && <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">No params yet.</p>}

      <div className="space-y-2">
        {params.map((param, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveRow(i, "up")} disabled={i === 0} aria-label="Move up"
                className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 dark:text-gray-500">
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" onClick={() => moveRow(i, "down")} disabled={i === params.length - 1} aria-label="Move down"
                className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20 dark:text-gray-500">
                <ChevronDown className="size-3.5" />
              </button>
            </div>
            <input
              value={param.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Param name (e.g. Calories)"
              className={inputCls + " min-w-[140px] flex-1"}
            />
            <div className="flex items-center gap-2">
              <input
                value={param.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
                placeholder="Unit (e.g. kcal)"
                className={inputCls + " w-24"}
              />
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={param.featured}
                  onChange={(e) => update(i, { featured: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
                Featured
              </label>
              <button type="button" onClick={() => removeRow(i)} aria-label="Remove parameter"
                className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500 dark:text-gray-600">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        &quot;Featured&quot; params are shown as a prominent badge (like kcal). Others are shown inline.
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={addRow}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:brightness-90">
          <Plus className="size-4" aria-hidden />
          Add param
        </button>
        <button type="button" onClick={handleSave} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save params
        </button>
      </div>
    </div>
  )
}
