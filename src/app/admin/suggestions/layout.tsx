import { SectionTabs } from "@/components/ui/section-tabs"

const TABS = [
  { href: "/admin/suggestions",            label: "All suggestions" },
  { href: "/admin/suggestions/categories", label: "Categories"      },
]

export default function SuggestionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  )
}
