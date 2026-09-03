"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface Tab {
  href: string
  label: string
  /**
   * Explicit active override. When omitted, the component detects the active
   * tab by picking the longest-prefix match in `pathname` — works for route
   * tabs. Pass `active` explicitly for query-param tabs (e.g. `?tab=dishes`).
   */
  active?: boolean
}

interface Props {
  tabs: Tab[]
}

/**
 * Horizontal underline tab bar for admin sections.
 *
 * Route tabs: omit `active` and the component auto-detects via pathname.
 * Query-param tabs: pass `active` on each tab explicitly (server-computed).
 */
export function SectionTabs({ tabs }: Props) {
  const pathname = usePathname()
  const hrefs = tabs.map((t) => t.href)

  return (
    <nav className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active =
          tab.active !== undefined
            ? tab.active
            : pathname.startsWith(tab.href) &&
              !hrefs.some(
                (h) => h !== tab.href && pathname.startsWith(h) && h.startsWith(tab.href)
              )
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative px-4 pb-3 text-sm font-medium transition-colors
              ${
                active
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:bg-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
