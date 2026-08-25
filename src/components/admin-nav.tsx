"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Layers,
  Users,
  Tag,
  ShieldCheck,
  Palette,
  Brush,
  ScrollText,
  Compass,
  CalendarDays,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react"

interface Item {
  href: string
  label: string
  icon: LucideIcon
}

const BASE_CONTENT: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/pages", label: "Pages", icon: Layers },
  { href: "/admin/categories", label: "Categories", icon: Tag },
  { href: "/admin/navigation", label: "Navigation", icon: Compass },
]

const EVENTS_ITEM: Item = { href: "/admin/events", label: "Events", icon: CalendarDays }

const ADMINISTRATION: Item[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
]

const SYSTEM: Item[] = [
  { href: "/admin/modules", label: "Modules", icon: LayoutGrid },
  { href: "/admin/branding", label: "Branding", icon: Brush },
  { href: "/admin/theme", label: "Theme", icon: Palette },
  { href: "/admin/auth-providers", label: "Authentication", icon: ShieldCheck },
]

/** `/admin` must not light up for every child route, so it matches exactly. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNav({
  canAdminister,
  eventsEnabled,
}: {
  canAdminister: boolean
  eventsEnabled: boolean
}) {
  const pathname = usePathname()

  const content = eventsEnabled
    ? [BASE_CONTENT[0], BASE_CONTENT[1], EVENTS_ITEM, ...BASE_CONTENT.slice(2)]
    : BASE_CONTENT

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Admin">
      <Group items={content} pathname={pathname} />
      {canAdminister && (
        <>
          <Group label="Administration" items={ADMINISTRATION} pathname={pathname} />
          <Group label="System" items={SYSTEM} pathname={pathname} />
        </>
      )}
    </nav>
  )
}

function Group({
  label,
  items,
  pathname,
}: {
  label?: string
  items: Item[]
  pathname: string
}) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
          {label}
        </p>
      )}
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm
              transition-colors ${
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
          >
            {/* Brand rail marks the current section without shifting the label. */}
            <span
              aria-hidden
              className={`absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r-full
                bg-brand transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
            />
            <item.icon
              className={`size-4 shrink-0 transition-colors ${
                active ? "text-white" : "text-gray-500 group-hover:text-gray-300"
              }`}
              aria-hidden
            />
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
