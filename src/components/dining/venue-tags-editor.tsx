"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react"
import { upsertVenueTags } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"

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
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [pending, start] = useTransition()

  function update(i: number, patch: Partial<Tag>) {
    setTags((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  }

  function addRow() {
    setTags((ts) => [...ts, { name: "", color: PRESETS[0].color, bgColor: PRESETS[0].bgColor, order: ts.length }])
  }

  function removeRow(i: number) {
    setTags((ts) => ts.filter((_, j) => j !== i).map((t, j) => ({ ...t, order: j })))
  }

  function moveRow(i: number, dir: "up" | "down") {
    const j = dir === "up" ? i - 1 : i + 1
    if (j < 0 || j >= tags.length) return
    setTags((ts) => {
      const next = [...ts]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next.map((t, k) => ({ ...t, order: k }))
    })
  }

  function handleSave() {
    for (const t of tags) {
      if (!t.name.trim()) { toast.error("All tags need a name."); return }
    }
    start(async () => {
      const res = await upsertVenueTags(venueId, tags)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Saved.")
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Tags</h2>
        <p className="text-xs text-gray-400">Custom dish tags (Halal, Vegan, etc.)</p>
      </div>

      {tags.length === 0 && <p className="mb-4 text-sm text-gray-400">No tags yet.</p>}

      <div className="space-y-2">
        {tags.map((tag, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => moveRow(i, "up")} disabled={i === 0}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                <ChevronUp className="size-3" />
              </button>
              <button type="button" onClick={() => moveRow(i, "down")} disabled={i === tags.length - 1}
                className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                <ChevronDown className="size-3" />
              </button>
            </div>

            <input
              value={tag.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Tag name"
              className="w-36 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
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

            <button type="button" onClick={() => removeRow(i)}
              className="ml-auto shrink-0 rounded p-1 text-gray-300 hover:text-red-500">
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
