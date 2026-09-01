"use client"

import { useState } from "react"
import { Plus, Check, UtensilsCrossed } from "lucide-react"
import { SafeImg } from "@/components/dining/safe-img"
import { formatPrice, formatPriceDelta } from "@/lib/format-price"
import { useCart } from "@/lib/cart"

type ModifierOption = { id: string; label: string; priceDelta: number; isDefault: boolean; color?: string | null }
type ModifierGroup = { id: string; name: string; required: boolean; multiSelect: boolean; options: ModifierOption[] }
type Tag = { id: string; name: string; color: string; bgColor: string }
type NutritionParam = { id: string; name: string; unit: string; featured: boolean }

type Entry = {
  id: string
  name: string | null
  description: string | null
  photo: string | null
  price: number | null
  nutrition: Record<string, number> | null
  tagIds: string
  note: string | null
  soldOut: boolean
  modifierGroups: ModifierGroup[]
}

function initSelected(groups: ModifierGroup[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const g of groups) {
    out[g.id] = g.options.filter((o) => o.isDefault).map((o) => o.id)
  }
  return out
}

export function EntryCard({
  entry, tags, nutritionParams, currency,
}: {
  entry: Entry
  tags: Tag[]
  nutritionParams: NutritionParam[]
  currency: string
}) {
  const [selected, setSelected] = useState(() => initSelected(entry.modifierGroups))
  const [added, setAdded] = useState(false)
  const cart = useCart()

  const resolvedName = entry.name ?? "Item"

  const selectedOptions = entry.modifierGroups.flatMap((g) =>
    g.options.filter((o) => (selected[g.id] ?? []).includes(o.id)).map((o) => ({ ...o, group: g }))
  )
  const unitPrice = (entry.price ?? 0) + selectedOptions.reduce((s, o) => s + o.priceDelta, 0)

  const canAdd = entry.modifierGroups
    .filter((g) => g.required)
    .every((g) => (selected[g.id] ?? []).length > 0)

  function toggle(groupId: string, optionId: string, multiSelect: boolean, required: boolean) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? []
      if (multiSelect) {
        const next = cur.includes(optionId) ? cur.filter((id) => id !== optionId) : [...cur, optionId]
        if (required && next.length === 0) return prev
        return { ...prev, [groupId]: next }
      }
      if (required && cur[0] === optionId) return prev
      return { ...prev, [groupId]: cur[0] === optionId ? [] : [optionId] }
    })
  }

  function handleAdd() {
    if (entry.price === null || !canAdd || entry.soldOut) return
    const modifiers = selectedOptions.map((o) => ({
      groupId: o.group.id,
      groupName: o.group.name,
      optionLabel: o.label,
      priceDelta: o.priceDelta,
    }))
    const thumbPhoto = entry.photo ? `${entry.photo}?w=128` : null
    cart.add({ entryId: entry.id, name: resolvedName, photo: thumbPhoto, basePrice: entry.price, modifiers, unitPrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1000)
  }

  const entryTags = (entry.tagIds || "").split(",").filter(Boolean)
    .map((tid) => tags.find((t) => t.id === tid))
    .filter((t): t is Tag => !!t)

  const featured = nutritionParams.find((p) => p.featured)
  const others = nutritionParams.filter((p) => !p.featured)

  return (
    <div className={`flex gap-3 ${entry.soldOut ? "opacity-50" : ""}`}>
      {/* Photo */}
      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        {entry.photo ? (
          <SafeImg src={entry.photo ? `${entry.photo}?w=128` : null} alt={resolvedName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UtensilsCrossed className="size-5 text-gray-300 dark:text-gray-600" aria-hidden />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">{resolvedName}</p>
              {entry.soldOut && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  Sold out
                </span>
              )}
            </div>
            {entry.description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{entry.description}</p>
            )}
          </div>
          {entry.price != null && (
            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-sm font-semibold tabular-nums text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {formatPrice(unitPrice, currency)}
            </span>
          )}
        </div>

        {entry.nutrition && nutritionParams.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {featured && entry.nutrition[featured.id] != null && (
              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {entry.nutrition[featured.id]}{featured.unit}
              </span>
            )}
            {others.map((p) =>
              entry.nutrition![p.id] != null ? (
                <span key={p.id} className="text-[11px] text-gray-400 dark:text-gray-500">
                  {p.name} {entry.nutrition![p.id]}{p.unit}
                </span>
              ) : null,
            )}
          </div>
        )}

        {entryTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {entryTags.map((t) => (
              <span
                key={t.id}
                style={{ backgroundColor: t.bgColor, color: t.color }}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        {entry.modifierGroups.length > 0 ? (
          <div className="mt-2 space-y-2">
            {entry.modifierGroups.map((g, gIdx) => {
              const isLast = gIdx === entry.modifierGroups.length - 1
              return (
                <div key={g.id}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {g.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {g.options.map((o) => {
                      const on = (selected[g.id] ?? []).includes(o.id)
                      const c = o.color
                      const colorStyle = c
                        ? on
                          ? { backgroundColor: c, borderColor: c, color: "#fff" }
                          : { backgroundColor: c + "1a", borderColor: c + "60", color: c }
                        : undefined
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggle(g.id, o.id, g.multiSelect, g.required)}
                          style={colorStyle}
                          className={`min-h-[32px] rounded-full border px-3 py-1 text-[12px] font-medium transition-all active:scale-95 ${
                            c
                              ? "shadow-sm"
                              : on
                                ? "border-brand bg-brand text-white"
                                : "border-gray-200 text-gray-500 hover:border-brand/40 hover:text-brand dark:border-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {o.label}
                          {o.priceDelta !== 0 && (
                            <span className={`ml-1 text-[10px] ${on || c ? "opacity-75" : "text-gray-400"}`}>
                              {formatPriceDelta(o.priceDelta, currency)}
                            </span>
                          )}
                        </button>
                      )
                    })}
                    {isLast && entry.price != null && (
                      <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!canAdd || entry.soldOut}
                        className={`ml-auto flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${
                          added ? "bg-emerald-500" : "bg-brand"
                        }`}
                        aria-label="Add to cart"
                      >
                        {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : entry.price != null ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd || entry.soldOut}
              className={`flex size-9 items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${
                added ? "bg-emerald-500" : "bg-brand"
              }`}
              aria-label="Add to cart"
            >
              {added ? <Check className="size-4" /> : <Plus className="size-4" />}
            </button>
          </div>
        ) : null}

        {entry.note && (
          <p className="mt-1.5 text-[11px] italic text-gray-400 dark:text-gray-500">{entry.note}</p>
        )}
      </div>
    </div>
  )
}
