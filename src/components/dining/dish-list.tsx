"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Plus, Loader2, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react"
import { formatPrice, getCurrencySymbol } from "@/lib/format-price"
import { createDish, updateDish, deleteDish, saveDishModifiers } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { MediaPickerField } from "@/components/media-picker"
import { inputClass } from "@/components/ui/field"
import { SafeImg } from "@/components/dining/safe-img"

type NutritionParam = { id: string; name: string; unit: string; featured: boolean }
type VenueTag = { id: string; name: string; color: string; bgColor: string }

type ModifierOption = { id?: string; label: string; priceDelta: number; isDefault: boolean; order: number }
type ModifierGroup = { id?: string; name: string; required: boolean; multiSelect: boolean; order: number; options: ModifierOption[] }

type Dish = {
  id: string; venueId: string; name: string; description: string | null; photo: string | null
  price: number | null; nutrition: unknown; tagIds: string; createdAt: Date
  modifierGroups?: ModifierGroup[]
}

const lbl = "mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"
const numCls = inputClass + " max-w-[100px]"

// ── Modifier group editor (reused from fixed-menu-editor) ──────────────────────

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
  function updateOpt(i: number, patch: Partial<ModifierOption>) {
    onChange({ ...group, options: group.options.map((o, idx) => idx === i ? { ...o, ...patch } : o) })
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
          <input type="checkbox" checked={group.required} onChange={(e) => onChange({ ...group, required: e.target.checked })} className="rounded" />
          Required
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" checked={group.multiSelect} onChange={(e) => onChange({ ...group, multiSelect: e.target.checked })} className="rounded" />
          Multi
        </label>
        <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-600"><X className="size-3.5" /></button>
      </div>
      <div className="space-y-1.5">
        {group.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={opt.label}
              onChange={(e) => updateOpt(i, { label: e.target.value })}
              placeholder="Label"
              className="w-28 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <span className="text-xs text-gray-400">+{getCurrencySymbol(currency)}</span>
            <input
              type="number"
              value={opt.priceDelta}
              onChange={(e) => updateOpt(i, { priceDelta: Number(e.target.value) })}
              className="w-16 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-brand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              title="Default"
              onClick={() => updateOpt(i, { isDefault: !opt.isDefault })}
              className={`size-5 rounded-full border text-xs transition ${opt.isDefault ? "border-brand bg-brand text-white" : "border-gray-300 text-gray-400 hover:border-brand"}`}
            >
              <Check className="mx-auto size-3" />
            </button>
            <button type="button" onClick={() => onChange({ ...group, options: group.options.filter((_, j) => j !== i).map((o, j) => ({ ...o, order: j })) })} className="text-gray-400 hover:text-red-500">
              <X className="size-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...group, options: [...group.options, { label: "", priceDelta: 0, isDefault: false, order: group.options.length }] })}
          className="mt-1 flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
        >
          <Plus className="size-3" /> Add option
        </button>
      </div>
    </div>
  )
}

// ── Dish form ──────────────────────────────────────────────────────────────────

function DishForm({
  dish,
  venueId,
  nutritionParams,
  venueTags,
  currency = "JPY",
  onDone,
}: {
  dish?: Dish
  venueId: string
  nutritionParams: NutritionParam[]
  venueTags: VenueTag[]
  currency?: string
  onDone: () => void
}) {
  const router = useRouter()
  const [photo, setPhoto] = useState(dish?.photo ?? "")
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(dish?.tagIds ? dish.tagIds.split(",").filter(Boolean) : [])
  )
  const existingNutrition = (dish?.nutrition ?? {}) as Record<string, number>
  const [nutrition, setNutrition] = useState<Record<string, string>>(
    Object.fromEntries(nutritionParams.map((p) => [p.id, existingNutrition[p.id]?.toString() ?? ""]))
  )
  const [modifiers, setModifiers] = useState<ModifierGroup[]>(
    (dish?.modifierGroups ?? []).map((g) => ({ ...g, options: g.options ?? [] }))
  )
  const [showModifiers, setShowModifiers] = useState((dish?.modifierGroups?.length ?? 0) > 0)
  const [pending, start] = useTransition()

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("photo", photo)
    fd.set("tagIds", [...selectedTagIds].join(","))
    const nutritionObj: Record<string, number> = {}
    for (const p of nutritionParams) {
      const val = nutrition[p.id]
      if (val !== "" && val !== undefined) {
        const n = parseFloat(val)
        if (!isNaN(n)) nutritionObj[p.id] = n
      }
    }
    fd.set("nutrition", JSON.stringify(Object.keys(nutritionObj).length > 0 ? nutritionObj : null))

    start(async () => {
      const res = dish ? await updateDish(dish.id, fd) : await createDish(venueId, fd)
      if (!res.ok) { toast.error(res.error); return }

      const dishId = dish?.id ?? (res as { data?: { id: string } }).data?.id
      if (dishId && modifiers.length > 0) {
        const modRes = await saveDishModifiers(dishId, modifiers.map((g, i) => ({
          ...g,
          order: i,
          options: g.options.map((o, j) => ({ ...o, order: j })),
        })))
        if (!modRes.ok) { toast.error(modRes.error); return }
      } else if (dishId && modifiers.length === 0 && (dish?.modifierGroups?.length ?? 0) > 0) {
        await saveDishModifiers(dishId, [])
      }

      toast.success(dish ? "Saved." : "Dish created.")
      onDone()
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{dish ? "Edit dish" : "New dish"}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Name *</label>
          <input name="name" defaultValue={dish?.name} required placeholder="Dish name" className={inputClass} />
        </div>
        <div>
          <label className={lbl}>Description</label>
          <input name="description" defaultValue={dish?.description ?? ""} placeholder="Short description (optional)" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Photo</label>
          <MediaPickerField value={photo} onChange={setPhoto} folder="dining" />
        </div>
        <div>
          <label className={lbl}>Base price ({getCurrencySymbol(currency)})</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{getCurrencySymbol(currency)}</span>
            <input
              type="number"
              name="price"
              defaultValue={dish?.price ?? ""}
              placeholder="—"
              min="0"
              step="1"
              className={inputClass + " pl-6"}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Auto-fills when added to fixed menus</p>
        </div>
      </div>

      {nutritionParams.length > 0 && (
        <div>
          <p className={lbl}>Nutrition (per serving)</p>
          <div className="flex flex-wrap gap-2">
            {nutritionParams.map((p) => (
              <div key={p.id}>
                <label className={lbl}>{p.name}{p.unit ? ` (${p.unit})` : ""}</label>
                <input
                  type="number" min="0" step="0.1"
                  value={nutrition[p.id] ?? ""}
                  onChange={(e) => setNutrition((n) => ({ ...n, [p.id]: e.target.value }))}
                  className={numCls}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {venueTags.length > 0 && (
        <div>
          <p className={lbl}>Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {venueTags.map((t) => (
              <button
                key={t.id} type="button" onClick={() => toggleTag(t.id)}
                className="rounded px-2 py-1 text-xs font-medium transition"
                style={
                  selectedTagIds.has(t.id)
                    ? { color: t.color, backgroundColor: t.bgColor, outline: `2px solid ${t.color}` }
                    : { color: "#6b7280", backgroundColor: "#f3f4f6" }
                }
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modifiers section */}
      <div>
        <button
          type="button"
          onClick={() => setShowModifiers((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {showModifiers ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          Modifiers
          {modifiers.length > 0 && (
            <span className="ml-1 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
              {modifiers.length}
            </span>
          )}
        </button>

        {showModifiers && (
          <div className="mt-2.5 space-y-2">
            {modifiers.map((g, i) => (
              <ModifierGroupCard
                key={i}
                group={g}
                onChange={(updated) => setModifiers((gs) => gs.map((x, idx) => idx === i ? updated : x))}
                onDelete={() => setModifiers((gs) => gs.filter((_, idx) => idx !== i).map((x, j) => ({ ...x, order: j })))}
              />
            ))}
            <button
              type="button"
              onClick={() => setModifiers((gs) => [...gs, { name: "", required: false, multiSelect: false, order: gs.length, options: [] }])}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs font-medium text-gray-400 hover:border-brand hover:text-brand dark:border-gray-700"
            >
              <Plus className="size-3.5" /> Add modifier group
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <button type="button" onClick={onDone}
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">
          Cancel
        </button>
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {dish ? "Save" : "Create"}
        </button>
      </div>
    </form>
  )
}

// ── Dish list ──────────────────────────────────────────────────────────────────

export function DishList({
  venueId,
  dishes,
  total,
  page,
  perPage,
  q,
  nutritionParams,
  venueTags,
  currency = "JPY",
}: {
  venueId: string
  dishes: Dish[]
  total: number
  page: number
  perPage: number
  q?: string
  nutritionParams: NutritionParam[]
  venueTags: VenueTag[]
  currency?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [delPending, startDel] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const featuredParam = nutritionParams.find((p) => p.featured)
  const tagMap = new Map(venueTags.map((t) => [t.id, t]))

  function handleDelete(id: string) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    setConfirmDeleteId(null)
    startDel(async () => {
      const res = await deleteDish(id)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Deleted.")
      router.refresh()
    })
  }

  function navigate(newQ?: string, newPage?: number) {
    const params = new URLSearchParams(sp.toString())
    if (newQ !== undefined) { newQ ? params.set("q", newQ) : params.delete("q"); params.delete("page") }
    if (newPage !== undefined) newPage > 1 ? params.set("page", String(newPage)) : params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Search dishes…"
          defaultValue={q}
          onChange={(e) => navigate(e.target.value)}
          className="h-9 max-w-xs rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        {!showForm && !editId && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:brightness-95"
          >
            <Plus className="size-4" aria-hidden />
            New dish
          </button>
        )}
      </div>

      {showForm && (
        <DishForm venueId={venueId} nutritionParams={nutritionParams} venueTags={venueTags} currency={currency} onDone={() => setShowForm(false)} />
      )}

      {dishes.length === 0 ? (
        <p className="text-sm text-gray-400">{q ? "No dishes match the search." : "No dishes yet."}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <th className="px-4 py-3 text-left">Dish</th>
                <th className="px-4 py-3 text-right">Price</th>
                {featuredParam && <th className="px-4 py-3 text-right">{featuredParam.name}</th>}
                <th className="px-4 py-3 text-left">Tags</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {dishes.map((d) =>
                editId === d.id ? (
                  <tr key={d.id}>
                    <td colSpan={5} className="px-4 py-3">
                      <DishForm
                        dish={d}
                        venueId={venueId}
                        nutritionParams={nutritionParams}
                        venueTags={venueTags}
                        currency={currency}
                        onDone={() => setEditId(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                          {d.photo
                            ? <SafeImg src={d.photo} alt="" className="h-full w-full object-cover" />
                            : <div className="flex h-full w-full items-center justify-center"><UtensilsCrossed className="size-4 text-gray-300 dark:text-gray-600" /></div>}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{d.name}</p>
                          {d.description && <p className="text-xs text-gray-400">{d.description}</p>}
                          {(d.modifierGroups?.length ?? 0) > 0 && (
                            <p className="mt-0.5 text-[11px] text-gray-400">
                              {d.modifierGroups!.map((g) => g.name).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">
                      {d.price != null ? formatPrice(d.price, currency) : <span className="text-gray-300">—</span>}
                    </td>
                    {featuredParam && (
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {((d.nutrition as Record<string, number> | null)?.[featuredParam.id]) ?? "–"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {d.tagIds.split(",").filter(Boolean).map((id) => {
                          const tag = tagMap.get(id)
                          return tag ? (
                            <span key={id} className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                              style={{ color: tag.color, backgroundColor: tag.bgColor }}>
                              {tag.name}
                            </span>
                          ) : null
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditId(d.id)}
                          className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                          <Pencil className="size-3.5" />
                        </button>
                        {confirmDeleteId === d.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(d.id)} disabled={delPending}
                              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
                              Confirm
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleDelete(d.id)} disabled={delPending}
                            className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button disabled={page <= 1} onClick={() => navigate(undefined, page - 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400">
            Previous
          </button>
          <span className="text-xs text-gray-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => navigate(undefined, page + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
