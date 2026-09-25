"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Plus, Loader2, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react"
import { formatPrice, getCurrencySymbol } from "@/lib/format-price"
import { createDish, updateDish, deleteDish, saveDishModifiers } from "@/lib/actions/dining"
import { useAction } from "@/lib/use-action"
import { MediaPickerField } from "@/components/media-picker"
import { inputClass } from "@/components/ui/field"
import { SafeImg } from "@/components/dining/safe-img"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ok, type ActionResult } from "@/lib/actions/types"
import type { NutritionParam, VenueTag } from "@/lib/dining-types"

type ModifierOption = { id?: string; label: string; priceDelta: number; isDefault: boolean; order: number }
type ModifierGroup = { id?: string; name: string; required: boolean; multiSelect: boolean; order: number; options: ModifierOption[] }

type Dish = {
  id: string; venueId: string; name: string; description: string | null; photo: string | null
  price: number | null; nutrition: unknown; tagIds: string; createdAt: Date
  modifierGroups?: ModifierGroup[]
}

const lbl = "mb-1 block text-xs font-medium text-foreground"
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
    <div className="rounded-xl border border-border bg-muted p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <input
          value={group.name}
          onChange={(e) => onChange({ ...group, name: e.target.value })}
          placeholder="Group name (e.g. Size)"
          className="flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium outline-none focus:border-brand"
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={group.required} onChange={(e) => onChange({ ...group, required: e.target.checked })} className="rounded" />
          Required
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={group.multiSelect} onChange={(e) => onChange({ ...group, multiSelect: e.target.checked })} className="rounded" />
          Multi
        </label>
        <button type="button" onClick={onDelete} aria-label="Remove modifier group" className="text-red-400 hover:text-red-600"><X className="size-3.5" /></button>
      </div>
      <div className="space-y-1.5">
        {group.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              value={opt.label}
              onChange={(e) => updateOpt(i, { label: e.target.value })}
              placeholder="Label"
              className="w-28 rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:border-brand"
            />
            <span className="text-xs text-muted-foreground">+{getCurrencySymbol(currency)}</span>
            <input
              type="number"
              value={opt.priceDelta}
              onChange={(e) => updateOpt(i, { priceDelta: Number(e.target.value) })}
              className="w-16 rounded border border-border bg-card px-2 py-1 text-xs outline-none focus:border-brand"
            />
            <button
              type="button"
              title="Default"
              aria-label={opt.isDefault ? "Unset as default" : "Set as default"}
              onClick={() => updateOpt(i, { isDefault: !opt.isDefault })}
              className={`size-5 rounded-full border text-xs transition ${opt.isDefault ? "border-brand bg-brand text-white" : "border-border text-muted-foreground hover:border-brand"}`}
            >
              <Check className="mx-auto size-3" />
            </button>
            <button type="button" aria-label="Remove option" onClick={() => onChange({ ...group, options: group.options.filter((_, j) => j !== i).map((o, j) => ({ ...o, order: j })) })} className="text-muted-foreground hover:text-red-500">
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

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const { run, pending } = useAction(
    async (fd: FormData): Promise<ActionResult> => {
      const res = dish ? await updateDish(dish.id, fd) : await createDish(venueId, fd)
      if (!res.ok) return res

      const dishId = dish?.id ?? (res as { data?: { id: string } }).data?.id
      if (dishId && modifiers.length > 0) {
        const modRes = await saveDishModifiers(dishId, modifiers.map((g, i) => ({
          ...g,
          order: i,
          options: g.options.map((o, j) => ({ ...o, order: j })),
        })))
        if (!modRes.ok) return modRes
      } else if (dishId && modifiers.length === 0 && (dish?.modifierGroups?.length ?? 0) > 0) {
        await saveDishModifiers(dishId, [])
      }

      return ok(dish ? "Saved." : "Dish created.")
    },
    { onSuccess: () => { onDone(); router.refresh() } }
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    run(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card px-5 py-5">
      <h3 className="text-sm font-semibold text-foreground">{dish ? "Edit dish" : "New dish"}</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>Name <span aria-hidden="true">*</span></label>
          <input name="name" defaultValue={dish?.name} required placeholder="Dish name" className={inputClass} />
        </div>
        <div>
          <label className={lbl}>Description</label>
          <input name="description" defaultValue={dish?.description ?? ""} placeholder="Short description (optional)" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>Photo</label>
          <MediaPickerField value={photo} onChange={setPhoto} folder="dining" />
        </div>
        <div>
          <label className={lbl}>Base price ({getCurrencySymbol(currency)})</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{getCurrencySymbol(currency)}</span>
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
          <p className="mt-1 text-[11px] text-muted-foreground">Auto-fills when added to fixed menus</p>
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
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-muted-foreground"
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
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-brand hover:text-brand"
            >
              <Plus className="size-3.5" /> Add modifier group
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-3">
        <button type="button" onClick={onDone}
          className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const featuredParam = nutritionParams.find((p) => p.featured)
  const tagMap = new Map(venueTags.map((t) => [t.id, t]))

  const { run: runDelete, pending: delPending } = useAction(deleteDish, {
    onSuccess: () => { setConfirmDeleteId(null); router.refresh() },
  })

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
          className="h-9 max-w-xs rounded-lg border border-border px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
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
        <EmptyState
          icon={UtensilsCrossed}
          title={q ? "No dishes match the search." : "No dishes yet."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 text-left">Dish</th>
                <th className="px-4 py-3 text-right">Price</th>
                {featuredParam && <th className="px-4 py-3 text-right">{featuredParam.name}</th>}
                <th className="px-4 py-3 text-left">Tags</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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
                  <tr key={d.id} className="hover:bg-muted">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {d.photo
                            ? <SafeImg src={`${d.photo}?w=80`} alt="" className="h-full w-full object-cover" width={40} height={40} loading="lazy" />
                            : <div className="flex h-full w-full items-center justify-center"><UtensilsCrossed className="size-4 text-muted-foreground" /></div>}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{d.name}</p>
                          {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                          {(d.modifierGroups?.length ?? 0) > 0 && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {d.modifierGroups!.map((g) => g.name).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {d.price != null ? formatPrice(d.price, currency) : <span className="text-muted-foreground">—</span>}
                    </td>
                    {featuredParam && (
                      <td className="px-4 py-3 text-right text-muted-foreground">
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
                        <button onClick={() => setEditId(d.id)} aria-label="Edit"
                          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-muted-foreground">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(d.id)} disabled={delPending} aria-label="Delete"
                          className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                          <Trash2 className="size-3.5" />
                        </button>
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
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40">
            Previous
          </button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => navigate(undefined, page + 1)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Delete this dish?"
        description={`"${dishes.find((d) => d.id === confirmDeleteId)?.name ?? ""}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        pending={delPending}
        onConfirm={() => confirmDeleteId && runDelete(confirmDeleteId)}
      />
    </div>
  )
}
