import { EntryCard } from "@/components/dining/entry-card"
import type { NutritionParam, VenueTag, MenuEntry } from "@/lib/dining-types"

type Section = {
  id: string
  name: string
  entries: MenuEntry[]
}

interface Props {
  sections: Section[]
  tags: VenueTag[]
  nutritionParams?: NutritionParam[]
  currency?: string
}

export function FixedMenuView({ sections, tags, nutritionParams = [], currency = "JPY" }: Props) {
  if (!sections.length) {
    return (
      <div className="overflow-hidden rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">No menu available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.id}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {section.name}
          </h2>
          {section.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {section.entries.map((entry) => (
                <div key={entry.id} className="px-4 py-3.5">
                  <EntryCard entry={entry} tags={tags} nutritionParams={nutritionParams} currency={currency} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <p className="pt-4 text-center text-[11px] text-gray-200 dark:text-gray-800">- end of menu -</p>
    </div>
  )
}
