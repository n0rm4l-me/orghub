"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Loader2, Eye, EyeOff, GripVertical, Pencil, Trash2,
  ChevronDown, ChevronUp, Search, X, Check, UtensilsCrossed, Ban,
} from "lucide-react"
import { formatPrice, getCurrencySymbol } from "@/lib/format-price"
import {
  upsertFixedSections, createFixedEntry, updateFixedEntry, deleteFixedEntry,
  reorderFixedEntries, saveFixedEntryModifiers, getDishes,
  publishWeekMenu, unpublishWeekMenu, updateWeekMenuName, toggleSoldOut,
} from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { SafeImg } from "@/components/dining/safe-img"
import { MediaPickerField } from "@/components/media-picker"

// ── Types ──────────────────────────────────────────────────────────────────────

type ModifierOption = { id?: string; label: string; priceDelta: number; isDefault: boolean; color?: string | null; order: number }

const OPTION_COLORS = [
  { value: "#ef4444", label: "Hot" },
  { value: "#3b82f6", label: "Ice" },
  { value: "#22c55e", label: "Green" },
  { value: "#f97316", label: "Orange" },
  { value: "#a855f7", label: "Purple" },
  { value: "#eab308", label: "Gold" },
]
type ModifierGroup = { id?: string; name: string; required: boolean; multiSelect: boolean; order: number; options: ModifierOption[] }

type Entry = {
  id: string
  dishId: string | null
  name: string | null
  description: string | null
  photo: string | null
  price: number | null
  nutrition: Record<string, number> | null
  tagIds: string
  note: string | null
  soldOut: boolean
  order: number
  modifierGroups: (ModifierGroup & { id: string })[]
}

type Section = {
  id: string
  name: string
  order: number
  entries: Entry[]
}

type VenueTag = { id: string; name: string; color: string; bgColor: string }
type NutritionParam = { id: string; name: string; unit: string; featured: boolean }

type Dish = {
  id: string
  name: string
  description: string | null
  photo: string | null
  price: number | null
  nutrition: Record<string, number> | null
  tagIds: string
}

interface Props {
  menuId: string
  venueId: string
  menuName: string | null
  initialSections: Section[]
  publishedAt: string | null
  venueTags: VenueTag[]
  nutritionParams: NutritionParam[]
  currency?: string
}

// ── Drag helpers ───────────────────────────────────────────────────────────────

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// ── Dish search ────────────────────────────────────────────────────────────────

function DishSearch({ venueId, currency = "JPY", onPick }: { venueId: string; currency?: string; onPick: (d: Dish) => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<Dish[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

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
          ref={inputRef}
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder="Search dish library…"
          className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="size-9 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
                {d.photo
                  ? <SafeImg src={d.photo} alt={d.name} className="h-full w-full object-cover" />
                  : <div className="h-full w-full" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{d.name}</p>
                {d.description && <p className="truncate text-xs text-gray-400">{d.description}</p>}
              </div>
              {d.price != null && (
                <span className="shrink-0 text-xs font-medium text-gray-500">{formatPrice(d.price, currency)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modifier group editor ──────────────────────────────────────────────────────

function ModifierGroupCard({
  group,
  currency = "JPY",
  onChange,
  onDelete,
}: {
  group: ModifierGroup
  currency?: string
  onChange: (g: ModifierGroup) => void
  onDelete: () => void
}) {
  function updateOption(i: number, patch: Partial<ModifierOption>) {
    const opts = group.options.map((o, idx) => idx === i ? { ...o, ...patch } : o)
    onChange({ ...group, options: opts })
  }

  function addOption() {
    const opts = [...group.options, { label: "", priceDelta: 0, isDefault: false, color: null, order: group.options.length }]
    onChange({ ...group, options: opts })
  }

  function removeOption(i: number) {
    onChange({ ...group, options: group.options.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, order: idx })) })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="mb-2.5 flex items-center gap-2">
        <input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder="Group name (e.g. Size)"
          className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-medium outline-none focus:border-brand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={group.required}
            onChange={(e) => onChange({ ...group, required: e.target.checked })}
            className="rounded"
          />
          Required
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={group.multiSelect}
            onChange={(e) => onChange({ ...group, multiSelect: e.target.checked })}
            className="rounded"
          />
          Multi
        </label>
        <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-600">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        {group.options.map((opt, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <input
              value={opt.label}
              onChange={(e) => updateOption(i, { label: e.target.value })}
              placeholder="Label"
              className="w-24 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <span className="text-xs text-gray-400">+{getCurrencySymbol(currency)}</span>
            <input
              type="number"
              value={opt.priceDelta}
              onChange={(e) => updateOption(i, { priceDelta: Number(e.target.value) })}
              className="w-14 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            {/* Color swatches */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="No color"
                onClick={() => updateOption(i, { color: null })}
                className={`size-4 rounded-full border-2 bg-gray-200 dark:bg-gray-600 transition ${!opt.color ? "border-brand" : "border-transparent hover:border-gray-400"}`}
              />
              {OPTION_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => updateOption(i, { color: opt.color === c.value ? null : c.value })}
                  style={{ backgroundColor: c.value }}
                  className={`size-4 rounded-full border-2 transition ${opt.color === c.value ? "border-white scale-110 shadow-sm" : "border-transparent hover:scale-110"}`}
                />
              ))}
            </div>
            <button
              type="button"
              title="Default"
              onClick={() => updateOption(i, { isDefault: !opt.isDefault })}
              className={`size-5 rounded-full border text-xs transition ${opt.isDefault ? "border-brand bg-brand text-white" : "border-gray-300 text-gray-400 hover:border-brand"}`}
            >
              <Check className="mx-auto size-3" />
            </button>
            <button type="button" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500">
              <X className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          className="mt-1 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
        >
          <Plus className="size-3" /> Add option
        </button>
      </div>
    </div>
  )
}

// ── Entry editor (inline expanded card) ───────────────────────────────────────

function EntryEditor({
  entry,
  venueId,
  venueTags,
  nutritionParams,
  currency = "JPY",
  onSave,
  onCancel,
}: {
  entry: Entry | null
  venueId: string
  venueTags: VenueTag[]
  nutritionParams: NutritionParam[]
  currency?: string
  onSave: (data: Omit<Entry, "id" | "order">) => void
  onCancel: () => void
}) {
  const existingNutrition = (entry?.nutrition ?? {}) as Record<string, number>
  const [dishId, setDishId] = useState<string | null>(entry?.dishId ?? null)
  const [name, setName] = useState(entry?.name ?? "")
  const [description, setDescription] = useState(entry?.description ?? "")
  const [photo, setPhoto] = useState(entry?.photo ?? "")
  const [price, setPrice] = useState<string>(entry?.price != null ? String(entry.price) : "")
  const [note, setNote] = useState(entry?.note ?? "")
  const [tagIds, setTagIds] = useState<string[]>(
    (entry?.tagIds ?? "").split(",").filter(Boolean),
  )
  const [groups, setGroups] = useState<ModifierGroup[]>(
    (entry?.modifierGroups ?? []).map((g) => ({
      ...g,
      options: g.options ?? [],
    })),
  )
  const [nutrition, setNutrition] = useState<Record<string, string>>(
    Object.fromEntries(nutritionParams.map((p) => [p.id, existingNutrition[p.id]?.toString() ?? ""]))
  )
  const [showDishSearch, setShowDishSearch] = useState(!entry?.dishId)

  function pickDish(d: Dish) {
    setDishId(d.id)
    if (!name) setName(d.name)
    if (!description) setDescription(d.description ?? "")
    if (!photo) setPhoto(d.photo ?? "")
    if (!price && d.price != null) setPrice(String(d.price))
    if (d.nutrition) {
      setNutrition((prev) => {
        const merged = { ...prev }
        for (const p of nutritionParams) {
          if (merged[p.id] === "" && d.nutrition![p.id] != null) {
            merged[p.id] = String(d.nutrition![p.id])
          }
        }
        return merged
      })
    }
    setShowDishSearch(false)
  }

  function clearDish() {
    setDishId(null)
    setShowDishSearch(true)
  }

  function toggleTag(id: string) {
    setTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  function addGroup() {
    setGroups((g) => [
      ...g,
      { name: "", required: false, multiSelect: false, order: g.length, options: [] },
    ])
  }

  function handleSave() {
    if (!name.trim() && !dishId) { toast.error("Name or dish is required."); return }
    const nutritionObj: Record<string, number> = {}
    for (const p of nutritionParams) {
      const val = nutrition[p.id]
      if (val !== "" && val !== undefined) {
        const n = parseFloat(val)
        if (!isNaN(n)) nutritionObj[p.id] = n
      }
    }
    onSave({
      dishId,
      name: name.trim() || null,
      description: description.trim() || null,
      photo: photo.trim() || null,
      price: price.trim() ? Number(price.trim()) : null,
      tagIds: tagIds.join(","),
      note: note.trim() || null,
      soldOut: false,
      nutrition: Object.keys(nutritionObj).length > 0 ? nutritionObj : null,
      modifierGroups: groups.map((g, i) => ({
        ...g,
        order: i,
        options: g.options.map((o, j) => ({ ...o, order: j })),
      })) as Entry["modifierGroups"],
    })
  }

  return (
    <div className="rounded-xl border-2 border-brand bg-white p-4 shadow-sm dark:bg-gray-900">
      {/* Dish search or linked dish */}
      {showDishSearch ? (
        <div className="mb-3">
          <DishSearch venueId={venueId} currency={currency} onPick={pickDish} />
          {!name && (
            <p className="mt-1.5 text-[11px] text-gray-400">
              Pick from library or type a name below.
            </p>
          )}
        </div>
      ) : (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-brand/5 px-3 py-1.5">
          {photo && (
            <div className="size-8 shrink-0 overflow-hidden rounded-md">
              <SafeImg src={photo} alt={name} className="h-full w-full object-cover" />
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand">{name}</span>
          <button type="button" onClick={clearDish} className="text-xs text-gray-400 hover:text-brand">
            Change
          </button>
        </div>
      )}

      {/* Name + description */}
      <div className="mb-2.5 grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name *"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Photo */}
      <div className="mb-2.5">
        <MediaPickerField value={photo} onChange={setPhoto} />
      </div>

      {/* Price + note */}
      <div className="mb-2.5 grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{getCurrencySymbol(currency)}</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            className="w-full rounded-lg border border-gray-200 py-2 pl-6 pr-3 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (e.g. seasonal, chef's choice)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Tags */}
      {venueTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {venueTags.map((t) => {
            const active = tagIds.includes(t.id)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                style={active ? { backgroundColor: t.bgColor, color: t.color, borderColor: t.color } : {}}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition ${active ? "border-current" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Nutrition */}
      {nutritionParams.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Nutrition (per serving)</p>
          <div className="flex flex-wrap gap-2">
            {nutritionParams.map((p) => (
              <div key={p.id}>
                <label className="mb-0.5 block text-[11px] text-gray-400">
                  {p.name}{p.unit ? ` (${p.unit})` : ""}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={nutrition[p.id] ?? ""}
                  onChange={(e) => setNutrition((n) => ({ ...n, [p.id]: e.target.value }))}
                  className="w-20 rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modifier groups */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Modifiers</p>
          <button
            type="button"
            onClick={addGroup}
            className="flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <Plus className="size-3" /> Add group
          </button>
        </div>
        {groups.map((g, i) => (
          <ModifierGroupCard
            key={i}
            group={g}
            currency={currency}
            onChange={(updated) => setGroups((gs) => gs.map((x, idx) => idx === i ? updated : x))}
            onDelete={() => setGroups((gs) => gs.filter((_, idx) => idx !== i).map((x, j) => ({ ...x, order: j })))}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:brightness-95"
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ── Entry row ──────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  venueId,
  venueTags,
  currency = "JPY",
  dragHandleProps,
  onEdit,
  onDelete,
  onToggleSoldOut,
}: {
  entry: Entry
  venueId: string
  venueTags: VenueTag[]
  currency?: string
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>
  onEdit: () => void
  onDelete: () => void
  onToggleSoldOut: (soldOut: boolean) => void
}) {
  const [soldOutPending, startSoldOut] = useTransition()
  const resolvedPhoto = entry.photo
  const resolvedName = entry.name ?? "Unnamed item"
  const tags = (entry.tagIds || "").split(",").filter(Boolean)
    .map((tid) => venueTags.find((t) => t.id === tid))
    .filter((t): t is VenueTag => !!t)

  return (
    <div className="group flex items-start gap-3 px-4 py-3">
      <div
        {...dragHandleProps}
        className="mt-1 cursor-grab shrink-0 text-gray-300 opacity-0 group-hover:opacity-100 active:cursor-grabbing dark:text-gray-600"
      >
        <GripVertical className="size-4" />
      </div>
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {resolvedPhoto
          ? <SafeImg src={resolvedPhoto} alt={resolvedName} className="h-full w-full object-cover" />
          : <div className="flex h-full w-full items-center justify-center"><UtensilsCrossed className="size-4 text-gray-300 dark:text-gray-600" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{resolvedName}</p>
        {entry.description && (
          <p className="line-clamp-1 text-xs text-gray-400 dark:text-gray-500">{entry.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {entry.price != null && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {formatPrice(entry.price, currency)}
            </span>
          )}
          {entry.modifierGroups.map((g) => (
            <span key={g.id} className="flex items-center gap-0.5">
              <span className="text-[10px] text-gray-400">{g.name}:</span>
              {g.options.map((o) => (
                <span
                  key={o.id ?? o.label}
                  className={`rounded px-1 py-0.5 text-[10px] ${o.isDefault ? "bg-brand/5 text-brand dark:bg-brand/10" : "text-gray-500 dark:text-gray-400"}`}
                >
                  {o.label}{o.priceDelta > 0 ? ` +${o.priceDelta}` : ""}
                </span>
              ))}
            </span>
          ))}
          {tags.map((t) => (
            <span
              key={t.id}
              style={{ backgroundColor: t.bgColor, color: t.color }}
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            >
              {t.name}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {entry.soldOut && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/20 dark:text-red-400">
            Sold out
          </span>
        )}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            disabled={soldOutPending}
            onClick={() => startSoldOut(async () => {
              const res = await toggleSoldOut(entry.id, !entry.soldOut)
              if (!res.ok) toast.error(res.error)
              else { toast.success(res.message ?? "Done."); onToggleSoldOut(!entry.soldOut) }
            })}
            title={entry.soldOut ? "Mark available" : "Mark as sold out"}
            className={`grid size-7 place-items-center rounded-lg text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 ${entry.soldOut ? "text-orange-500 opacity-100! dark:text-orange-400" : "hover:bg-orange-50 dark:hover:bg-orange-900/20"}`}
          >
            <Ban className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section ────────────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  venueId,
  venueTags,
  nutritionParams,
  currency = "JPY",
  dragHandleProps,
  onRename,
  onDelete,
  onEntriesChange,
  onEditingChange,
}: {
  section: Section
  venueId: string
  venueTags: VenueTag[]
  nutritionParams: NutritionParam[]
  currency?: string
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>
  onRename: (name: string) => void
  onDelete: () => void
  onEntriesChange: (entries: Entry[]) => void
  onEditingChange?: (editing: boolean) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(section.name)
  const [editingEntryId, setEditingEntryId] = useState<string | "new" | null>(null)
  const [entryDrag, setEntryDrag] = useState<{ from: number; over: number } | null>(null)
  const [reorderPending, startReorder] = useTransition()
  const [deletePending, startDelete] = useTransition()
  const [savePending, startSave] = useTransition()

  useEffect(() => { onEditingChange?.(editingEntryId !== null) }, [editingEntryId])

  function handleEntryDrop(to: number) {
    if (!entryDrag || entryDrag.from === to) { setEntryDrag(null); return }
    const reordered = reorder(section.entries, entryDrag.from, to)
      .map((e, i) => ({ ...e, order: i }))
    onEntriesChange(reordered)
    setEntryDrag(null)
    startReorder(async () => {
      const res = await reorderFixedEntries(section.id, reordered.map((e) => e.id))
      if (!res.ok) toast.error(res.error)
    })
  }

  function handleSaveEntry(data: Omit<Entry, "id" | "order">) {
    if (editingEntryId === "new") {
      startSave(async () => {
        const res = await createFixedEntry(section.id, {
          ...data,
          price: data.price,
        })
        if (!res.ok) { toast.error(res.error); return }
        const newEntry: Entry = {
          id: (res as { data: { id: string } }).data.id,
          order: section.entries.length,
          ...data,
        }
        onEntriesChange([...section.entries, newEntry])
        // Save modifiers
        if (data.modifierGroups.length > 0) {
          await saveFixedEntryModifiers(newEntry.id, data.modifierGroups)
        }
        setEditingEntryId(null)
      })
    } else if (editingEntryId) {
      startSave(async () => {
        const res = await updateFixedEntry(editingEntryId, { ...data, price: data.price })
        if (!res.ok) { toast.error(res.error); return }
        await saveFixedEntryModifiers(editingEntryId, data.modifierGroups)
        onEntriesChange(
          section.entries.map((e) =>
            e.id === editingEntryId
              ? { ...e, ...data, modifierGroups: data.modifierGroups as Entry["modifierGroups"] }
              : e,
          ),
        )
        setEditingEntryId(null)
      })
    }
  }

  function handleDeleteEntry(entryId: string) {
    startDelete(async () => {
      const res = await deleteFixedEntry(entryId)
      if (!res.ok) { toast.error(res.error); return }
      onEntriesChange(section.entries.filter((e) => e.id !== entryId).map((e, i) => ({ ...e, order: i })))
    })
  }

  const editingEntry = section.entries.find((e) => e.id === editingEntryId) ?? null

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
        <div
          {...dragHandleProps}
          className="cursor-grab text-gray-300 active:cursor-grabbing dark:text-gray-600"
        >
          <GripVertical className="size-4" />
        </div>

        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => { onRename(draftName); setEditingName(false) }}
            onKeyDown={(e) => { if (e.key === "Enter") { onRename(draftName); setEditingName(false) } if (e.key === "Escape") { setDraftName(section.name); setEditingName(false) } }}
            onDragStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 rounded border border-brand bg-white px-2 py-0.5 text-sm font-semibold outline-none dark:bg-gray-900 dark:text-gray-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="min-w-0 flex-1 text-left text-sm font-semibold text-gray-800 hover:text-brand dark:text-gray-200"
          >
            {section.name}
          </button>
        )}

        <span className="text-xs text-gray-400">{section.entries.length} items</span>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-600"
        >
          {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 dark:text-gray-600"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div>
          {/* Entry list */}
          {section.entries.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {section.entries.map((entry, i) => (
                editingEntryId === entry.id ? (
                  <div key={entry.id} className="p-3">
                    {savePending
                      ? <div className="flex h-20 items-center justify-center text-xs text-gray-400"><Loader2 className="mr-2 size-4 animate-spin" />Saving…</div>
                      : <EntryEditor
                          entry={editingEntry}
                          venueId={venueId}
                          venueTags={venueTags}
                          nutritionParams={nutritionParams}
                          currency={currency}
                          onSave={handleSaveEntry}
                          onCancel={() => setEditingEntryId(null)}
                        />
                    }
                  </div>
                ) : (
                  <div
                    key={entry.id}
                    draggable={editingEntryId === null}
                    onDragStart={() => setEntryDrag({ from: i, over: i })}
                    onDragOver={(e) => { e.preventDefault(); setEntryDrag((d) => d ? { ...d, over: i } : null) }}
                    onDrop={() => handleEntryDrop(i)}
                    onDragEnd={() => setEntryDrag(null)}
                    className={`transition-colors ${entryDrag?.over === i && entryDrag.from !== i ? "bg-brand/5" : ""}`}
                  >
                    <EntryRow
                      entry={entry}
                      venueId={venueId}
                      venueTags={venueTags}
                      currency={currency}
                      dragHandleProps={{}}
                      onEdit={() => setEditingEntryId(entry.id)}
                      onDelete={() => handleDeleteEntry(entry.id)}
                      onToggleSoldOut={(soldOut) => onEntriesChange(
                        section.entries.map((e) => e.id === entry.id ? { ...e, soldOut } : e)
                      )}
                    />
                  </div>
                )
              ))}
            </div>
          )}

          {/* New entry form */}
          {editingEntryId === "new" ? (
            <div className="border-t border-gray-100 p-3 dark:border-gray-800">
              {savePending
                ? <div className="flex h-20 items-center justify-center text-xs text-gray-400"><Loader2 className="mr-2 size-4 animate-spin" />Saving…</div>
                : <EntryEditor
                    entry={null}
                    venueId={venueId}
                    venueTags={venueTags}
                    nutritionParams={nutritionParams}
                    currency={currency}
                    onSave={handleSaveEntry}
                    onCancel={() => setEditingEntryId(null)}
                  />
              }
            </div>
          ) : (
            <div className="border-t border-dashed border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => { setEditingEntryId("new"); setCollapsed(false) }}
                disabled={deletePending || reorderPending}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-medium text-brand hover:bg-brand/5 disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                Add item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main editor ────────────────────────────────────────────────────────────────

export function FixedMenuEditor({
  menuId,
  venueId,
  menuName,
  initialSections,
  publishedAt,
  venueTags,
  nutritionParams,
  currency = "JPY",
}: Props) {
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [name, setName] = useState(menuName ?? "")
  const [savedName, setSavedName] = useState(menuName ?? "")
  const [sectionDrag, setSectionDrag] = useState<{ from: number; over: number } | null>(null)
  const [anyEditing, setAnyEditing] = useState(false)
  const [namePending, startName] = useTransition()
  const [sectionsPending, startSections] = useTransition()
  const [publishPending, startPublish] = useTransition()

  function handleNameBlur() {
    const trimmed = name.trim() || null
    if (trimmed === savedName) return
    startName(async () => {
      const res = await updateWeekMenuName(menuId, trimmed)
      if (!res.ok) { toast.error(res.error); return }
      setSavedName(trimmed ?? "")
    })
  }

  function addSection() {
    const tempId = `new-${Date.now()}`
    const newSection: Section = { id: tempId, name: "New section", order: sections.length, entries: [] }
    const updated = [...sections, newSection]
    setSections(updated)
    startSections(async () => {
      const res = await upsertFixedSections(menuId, updated.map((s, i) => ({
        id: s.id.startsWith("new-") ? undefined : s.id,
        name: s.name,
        order: i,
      })))
      if (!res.ok) { toast.error(res.error); return }
      if (res.data?.sections) {
        const saved = res.data.sections as { id: string; name: string; order: number }[]
        const newSaved = saved[saved.length - 1]
        if (newSaved) setSections((prev) => prev.map((s) => s.id === tempId ? { ...s, id: newSaved.id } : s))
      }
      router.refresh()
    })
  }

  function renameSection(sectionId: string, newName: string) {
    const updated = sections.map((s) => s.id === sectionId ? { ...s, name: newName } : s)
    setSections(updated)
    startSections(async () => {
      const res = await upsertFixedSections(menuId, updated.map((s, i) => ({
        id: s.id.startsWith("new-") ? undefined : s.id,
        name: s.name,
        order: i,
      })))
      if (!res.ok) toast.error(res.error)
    })
  }

  function deleteSection(sectionId: string) {
    const updated = sections.filter((s) => s.id !== sectionId).map((s, i) => ({ ...s, order: i }))
    setSections(updated)
    startSections(async () => {
      const res = await upsertFixedSections(menuId, updated.map((s, i) => ({
        id: s.id.startsWith("new-") ? undefined : s.id,
        name: s.name,
        order: i,
      })))
      if (!res.ok) toast.error(res.error)
    })
  }

  function handleSectionDrop(to: number) {
    if (!sectionDrag || sectionDrag.from === to) { setSectionDrag(null); return }
    const reordered = reorder(sections, sectionDrag.from, to).map((s, i) => ({ ...s, order: i }))
    setSections(reordered)
    setSectionDrag(null)
    startSections(async () => {
      const res = await upsertFixedSections(menuId, reordered.map((s, i) => ({
        id: s.id.startsWith("new-") ? undefined : s.id,
        name: s.name,
        order: i,
      })))
      if (!res.ok) toast.error(res.error)
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
            className={`w-64 rounded-lg border px-2 py-0.5 text-lg font-semibold text-gray-900 outline-none hover:border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-60 dark:text-gray-100 ${
              !name.trim() ? "border-red-300" : "border-transparent"
            }`}
          />
          {!name.trim() && <span className="text-xs text-red-400">Required</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePublishToggle}
            disabled={publishPending}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
              publishedAt
                ? "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
            }`}
          >
            {publishPending ? <Loader2 className="size-3.5 animate-spin" /> : publishedAt ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {publishedAt ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, i) => (
          <div
            key={section.id}
            draggable={!anyEditing}
            onDragStart={() => setSectionDrag({ from: i, over: i })}
            onDragOver={(e) => { e.preventDefault(); setSectionDrag((d) => d ? { ...d, over: i } : null) }}
            onDrop={() => handleSectionDrop(i)}
            onDragEnd={() => setSectionDrag(null)}
            className={`transition-transform ${sectionDrag?.over === i && sectionDrag.from !== i ? "scale-[1.01] opacity-80" : ""}`}
          >
            <SectionBlock
              section={section}
              venueId={venueId}
              venueTags={venueTags}
              nutritionParams={nutritionParams}
              currency={currency}
              dragHandleProps={{
                onMouseDown: (e) => e.stopPropagation(),
              }}
              onRename={(newName) => renameSection(section.id, newName)}
              onDelete={() => deleteSection(section.id)}
              onEntriesChange={(entries) =>
                setSections((ss) => ss.map((s) => s.id === section.id ? { ...s, entries } : s))
              }
              onEditingChange={setAnyEditing}
            />
          </div>
        ))}
      </div>

      {/* Add section */}
      <button
        type="button"
        onClick={addSection}
        disabled={sectionsPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-400 transition hover:border-brand hover:text-brand disabled:opacity-50 dark:border-gray-700 dark:hover:border-brand"
      >
        {sectionsPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Add section
      </button>
    </div>
  )
}
