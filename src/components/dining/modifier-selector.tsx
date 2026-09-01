"use client"

import { useState } from "react"
import { Plus, Check } from "lucide-react"
import { useCart } from "@/lib/cart"
import { formatPriceDelta, formatPrice } from "@/lib/format-price"

type ModifierOption = { id: string; label: string; priceDelta: number; isDefault: boolean; color?: string | null }
type ModifierGroup = { id: string; name: string; required: boolean; multiSelect: boolean; options: ModifierOption[] }

function initSelected(groups: ModifierGroup[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const g of groups) {
    out[g.id] = g.options.filter((o) => o.isDefault).map((o) => o.id)
  }
  return out
}

interface Props {
  entryId: string
  entryName: string
  entryPhoto: string | null
  basePrice: number | null
  groups: ModifierGroup[]
  currency: string
}

export function ModifierSelector({ entryId, entryName, entryPhoto, basePrice, groups, currency }: Props) {
  const [selected, setSelected] = useState(() => initSelected(groups))
  const [added, setAdded] = useState(false)
  const cart = useCart()

  if (!groups.length && basePrice === null) return null

  function toggle(groupId: string, optionId: string, multiSelect: boolean) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? []
      if (multiSelect) {
        return { ...prev, [groupId]: cur.includes(optionId) ? cur.filter((id) => id !== optionId) : [...cur, optionId] }
      }
      return { ...prev, [groupId]: cur[0] === optionId ? [] : [optionId] }
    })
  }

  const selectedOptions = groups.flatMap((g) =>
    g.options.filter((o) => (selected[g.id] ?? []).includes(o.id)).map((o) => ({ ...o, group: g }))
  )
  const totalDelta = selectedOptions.reduce((s, o) => s + o.priceDelta, 0)
  const unitPrice = (basePrice ?? 0) + totalDelta

  function handleAdd() {
    if (basePrice === null) return
    const modifiers = selectedOptions.map((o) => ({
      groupId: o.group.id,
      groupName: o.group.name,
      optionLabel: o.label,
      priceDelta: o.priceDelta,
    }))
    cart.add({ entryId, name: entryName, photo: entryPhoto, basePrice, modifiers, unitPrice })
    setAdded(true)
    setTimeout(() => setAdded(false), 1000)
  }

  return (
    <div className="mt-2.5 space-y-2">
      {groups.map((g) => (
        <div key={g.id}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {g.name}
          </p>
          <div className="flex flex-wrap gap-1.5">
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
                  onClick={() => toggle(g.id, o.id, g.multiSelect)}
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
          </div>
        </div>
      ))}

      {basePrice !== null && (
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={handleAdd}
            className={`flex size-9 items-center justify-center rounded-full text-white shadow-sm transition-all active:scale-90 ${
              added ? "bg-emerald-500" : "bg-brand"
            }`}
            aria-label="Add to cart"
          >
            {added ? <Check className="size-4" /> : <Plus className="size-4" />}
          </button>
        </div>
      )}
    </div>
  )
}
