import { SectionTabs } from "@/components/ui/section-tabs"

const TABS = [
  { href: "/admin/articles",            label: "All articles" },
  { href: "/admin/articles/categories", label: "Categories"   },
]

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  )
}
