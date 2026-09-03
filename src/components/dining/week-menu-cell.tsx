"use client"

import { useState } from "react"
import { Plus, X, Search, Loader2, Pencil } from "lucide-react"
import { getDishes } from "@/lib/actions/dining"
import { SafeImg } from "@/components/dining/safe-img"

type NutritionParam = { id: string; name: string; unit: string; featured: boolean }
type VenueTag = { id: string; name: string; color: string; bgColor: string }

type EntryData = {
  dishId?: string | null
  name?: string | null
  description?: string | null
  photo?: string | null
  nutrition?: Record<string, number | null> | null
  tagIds?: string
  note?: string | null
}

type Dish = {
  id: string
  name: string
  description: string | null
  photo: string | null
  nutrition: Record<string, number> | null
  tagIds: string
}

function DishSearch({ venueId, onPick }: { venueId: string; onPick: (d: Dish) => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Dish[]>([])
  const [loading, setLoading] = useState(false)

  async function search(val: string) {
    setQ(val)
    if (!val.trim()) { setResults([]); return }
    setLoading(true)
    const res = await getDishes(venueId, val)
    setLoading(false)
    if (res.ok && "data" in res) setResults(res.data as Dish[])
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder="Search dish library…"
          className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-gray-400" />}
      </div>
      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-0.5 max-h-52 overflow-y-auto rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {results.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => { onPick(d); setQ(""); setResults([]) }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/60"
            >
              <SafeImg src={d.photo ? `${d.photo}?w=72` : d.photo} alt="" className="size-9 shrink-0 rounded-lg object-cover" placeholderClassName="size-9 shrink-0 rounded-lg" width={36} height={36} loading="lazy" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{d.name}</p>
                {d.description && <p className="truncate text-xs text-gray-400 dark:text-gray-500">{d.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function WeekMenuCell({
  catName, venueId, entry, nutritionParams, venueTags, onSet, onClear,
}: {
  catName: string
  venueId: string
  entry: EntryData | undefined
  nutritionParams: NutritionParam[]
  venueTags: VenueTag[]
  onSet: (data: EntryData) => void
  onClear: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EntryData>(entry ?? {})

  function open() { setDraft(entry ?? {}); setEditing(true) }
  function close() { setEditing(false) }

  function handlePickDish(d: Dish) {
    setDraft({ dishId: d.id, name: d.name, description: d.description, photo: d.photo, nutrition: d.nutrition, tagIds: d.tagIds })
  }

  function handleSave() {
    if (draft.dishId || draft.name) onSet(draft)
    else onClear()
    close()
  }

  function handleClear() { onClear(); setDraft({}); close() }

  const featuredParam = nutritionParams.find((p) => p.featured)
  const featuredVal = featuredParam && entry?.nutrition
    ? (entry.nutrition as Record<string, number>)[featuredParam.id]
    : null
  const draftFeaturedVal = featuredParam && draft.nutrition
    ? (draft.nutrition as Record<string, number>)[featuredParam.id]
    : null

  const filled = !!(entry?.name || entry?.dishId)
  const tagIds = (entry?.tagIds || "").split(",").filter(Boolean)

  if (editing) {
    return (
      <div className="rounded-xl border-2 border-brand bg-white p-4 shadow-sm dark:bg-gray-900">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand">{catName}</p>
        <div className="space-y-3">
          <DishSearch venueId={venueId} onPick={handlePickDish} />

          {(draft.dishId || draft.name) && (
            <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700">
                <SafeImg src={draft.photo} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{draft.name}</p>
                {draft.description && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{draft.description}</p>
                )}
                {draftFeaturedVal != null && (
                  <span className="mt-1.5 inline-block rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                    {draftFeaturedVal} {featuredParam?.unit}
                  </span>
                )}
              </div>
            </div>
          )}

          <input
            value={draft.note ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value || null }))}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:brightness-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // View state — same structure as portal MobileWeekMenu
  return (
    <div className="group">
      {/* Category label — own line, same as portal */}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {catName}
      </p>

      {/* Dish row — flex, same as portal */}
      <div
        onClick={!filled ? open : undefined}
        className={`flex gap-3 ${!filled ? "cursor-pointer" : ""}`}
      >
        {/* Photo — size-16, same as portal */}
        <div
          className={`size-16 shrink-0 overflow-hidden rounded-lg transition ${
            filled
              ? "bg-gray-100 dark:bg-gray-800"
              : "border-2 border-dashed border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
          }`}
        >
          {filled ? (
            <SafeImg src={entry?.photo ? `${entry.photo}?w=128` : entry?.photo} alt="" className="size-full object-cover" width={64} height={64} loading="lazy" />
          ) : (
            <div className="flex size-full items-center justify-center text-gray-300 dark:text-gray-600">
              <Plus className="size-4" />
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          {filled ? (
            <>
              <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
                {entry?.name}
              </p>
              {entry?.description && (
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{entry.description}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {featuredVal != null && (
                  <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                    {featuredVal} {featuredParam?.unit}
                  </span>
                )}
                {tagIds.map((tid) => {
                  const tag = venueTags.find((t) => t.id === tid)
                  if (!tag) return null
                  return (
                    <span
                      key={tid}
                      className="venue-tag rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ "--tag-color": tag.color, "--tag-bg": tag.bgColor } as React.CSSProperties}
                    >
                      {tag.name}
                    </span>
                  )
                })}
              </div>
              {entry?.note && (
                <p className="mt-1 text-[11px] italic text-gray-400 dark:text-gray-500">{entry.note}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-300 dark:text-gray-600">Click to add</p>
          )}
        </div>

        {/* Hover actions — only when filled */}
        {filled && (
          <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); open() }}
              className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand dark:hover:bg-gray-800"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClear() }}
              className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/10 dark:hover:text-red-400"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
