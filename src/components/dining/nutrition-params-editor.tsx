"use client"

import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { upsertNutritionParams } from "@/lib/actions/dining"
import { useOrderedRows } from "@/lib/use-ordered-rows"

type Param = { id?: string; name: string; unit: string; featured: boolean; order: number }

const inputCls = "rounded-lg border border-border px-3 py-2 text-base sm:text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"

export function NutritionParamsEditor({
  venueId,
  initialParams,
}: {
  venueId: string
  initialParams: { id: string; name: string; unit: string; featured: boolean; order: number }[]
}) {
  const router = useRouter()
  const { rows: params, update, addRow, removeRow, moveRow, handleSave, pending } = useOrderedRows<Param>(
    initialParams,
    (p) => upsertNutritionParams(venueId, p),
    (order) => ({ name: "", unit: "", featured: false, order }),
    "All params need a name.",
    () => router.refresh(),
  )

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Nutrition parameters</h2>
        <p className="text-xs text-muted-foreground">Custom per-serving values shown on menu cards</p>
      </div>

      {params.length === 0 && <p className="mb-4 text-sm text-muted-foreground">No params yet.</p>}

      <div className="space-y-2">
        {params.map((param, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveRow(i, "up")} disabled={i === 0} aria-label="Move up"
                className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" onClick={() => moveRow(i, "down")} disabled={i === params.length - 1} aria-label="Move down"
                className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
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
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={param.featured}
                  onChange={(e) => update(i, { featured: e.target.checked })}
                  className="rounded border-border"
                />
                Featured
              </label>
              <button type="button" onClick={() => removeRow(i)} aria-label="Remove parameter"
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-red-500">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
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
