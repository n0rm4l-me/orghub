/**
 * Display-only shapes shared by the dining components that render a venue's
 * tags, nutrition params, and menu entries. Was declared inline, identically,
 * in 6+ files; consolidated here. Editor-specific variants (which add `order`
 * and an optional `id` for unsaved rows) and the dish-vs-fixed-menu modifier
 * split (fixed-menu modifiers have a `color`, dish modifiers don't) are real,
 * schema-backed differences and intentionally stay separate from these.
 */

export type NutritionParam = { id: string; name: string; unit: string; featured: boolean }

export type VenueTag = { id: string; name: string; color: string; bgColor: string }

export type ModifierOption = { id: string; label: string; priceDelta: number; isDefault: boolean; color?: string | null }
export type ModifierGroup = { id: string; name: string; required: boolean; multiSelect: boolean; options: ModifierOption[] }

export type MenuEntry = {
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
