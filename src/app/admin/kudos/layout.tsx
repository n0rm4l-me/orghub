import { SectionTabs } from "@/components/ui/section-tabs"

const TABS = [
  { href: "/admin/kudos",             label: "Entries"      },
  { href: "/admin/kudos/redemptions", label: "Redemptions"  },
]

export default function KudosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SectionTabs tabs={TABS} />
      {children}
    </div>
  )
}
