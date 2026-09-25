"use client"

import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { upsertVenueTags } from "@/lib/actions/dining"
import { useOrderedRows } from "@/lib/use-ordered-rows"

type Tag = { id?: string; name: string; color: string; bgColor: string; order: number }

const PRESETS = [
  { color: "#374151", bgColor: "#F3F4F6" }, // gray
  { color: "#065f46", bgColor: "#D1FAE5" }, // green
  { color: "#1e40af", bgColor: "#DBEAFE" }, // blue
  { color: "#9f1239", bgColor: "#FFE4E6" }, // red
  { color: "#92400e", bgColor: "#FEF3C7" }, // amber
  { color: "#6b21a8", bgColor: "#EDE9FE" }, // purple
  { color: "#0f5132", bgColor: "#DCFCE7" }, // teal
  { color: "#7c2d12", bgColor: "#FFEDD5" }, // orange
]

function matchesPreset(tag: Tag, p: typeof PRESETS[number]) {
  return tag.color === p.color && tag.bgColor === p.bgColor
}

export function VenueTagsEditor({
  venueId,
  initialTags,
}: {
  venueId: string
  initialTags: { id: string; name: string; color: string; bgColor: string; order: number }[]
}) {
  const router = useRouter()
  const { rows: tags, update, addRow, removeRow, moveRow, handleSave, pending } = useOrderedRows<Tag>(
    initialTags,
    (t) => upsertVenueTags(venueId, t),
    (order) => ({ name: "", color: PRESETS[0].color, bgColor: PRESETS[0].bgColor, order }),
    "All tags need a name.",
    () => router.refresh(),
  )

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Tags</h2>
        <p className="text-xs text-muted-foreground">Custom dish tags (Halal, Vegan, etc.)</p>
      </div>

      {tags.length === 0 && <p className="mb-4 text-sm text-muted-foreground">No tags yet.</p>}

      <div className="space-y-2">
        {tags.map((tag, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveRow(i, "up")} disabled={i === 0} aria-label="Move up"
                className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
                <ChevronUp className="size-3" />
              </button>
              <button type="button" onClick={() => moveRow(i, "down")} disabled={i === tags.length - 1} aria-label="Move down"
                className="rounded p-0.5 text-muted-foreground hover:text-muted-foreground disabled:opacity-20">
                <ChevronDown className="size-3" />
              </button>
            </div>

            <input
              value={tag.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Tag name"
              className="w-36 rounded-lg border border-border px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />

            <div className="flex gap-1.5">
              {PRESETS.map((p, pi) => {
                const active = matchesPreset(tag, p)
                return (
                  <button
                    key={pi}
                    type="button"
                    title={`Color ${pi + 1}`}
                    onClick={() => update(i, { color: p.color, bgColor: p.bgColor })}
                    className={`size-5 rounded-full border-2 transition-transform hover:scale-110 ${active ? "border-gray-500 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: p.bgColor, boxShadow: active ? `0 0 0 1px ${p.color}40` : undefined }}
                  />
                )
              })}
            </div>

            <span
              className="min-w-[4rem] rounded-full px-2.5 py-0.5 text-center text-[11px] font-medium"
              style={{ color: tag.color, backgroundColor: tag.bgColor }}
            >
              {tag.name || "Preview"}
            </span>

            <button type="button" onClick={() => removeRow(i)} aria-label="Remove tag"
              className="ml-auto shrink-0 rounded p-1 text-muted-foreground hover:text-red-500">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={addRow}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:brightness-90">
          <Plus className="size-4" aria-hidden />
          Add tag
        </button>
        <button type="button" onClick={handleSave} disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save tags
        </button>
      </div>
    </div>
  )
}
