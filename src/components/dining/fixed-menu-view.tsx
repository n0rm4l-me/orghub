import { EntryCard } from "@/components/dining/entry-card"

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

type Section = {
  id: string
  name: string
  entries: Entry[]
}

interface Props {
  sections: Section[]
  tags: Tag[]
  nutritionParams?: NutritionParam[]
  currency?: string
}

export function FixedMenuView({ sections, tags, nutritionParams = [], currency = "JPY" }: Props) {
  if (!sections.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
        <p className="text-sm text-gray-400">No menu available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.id}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {section.name}
          </h2>
          {section.entries.length === 0 ? (
            <p className="text-sm text-gray-300 dark:text-gray-600">No items yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900">
              {section.entries.map((entry) => (
                <div key={entry.id} className="px-4 py-3.5">
                  <EntryCard entry={entry} tags={tags} nutritionParams={nutritionParams} currency={currency} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <p className="pt-4 text-center text-[11px] text-gray-200 dark:text-gray-800">— end of menu —</p>
    </div>
  )
}
