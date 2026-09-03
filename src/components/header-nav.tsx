"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"

interface ChildNavItem {
  href: string
  label: string
}

interface NavItem {
  href: string
  label: string
  badge?: number
  children?: ChildNavItem[]
}

interface Props {
  items: NavItem[]
}

const itemBase =
  "relative flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors select-none"
const itemInactive = "text-white/70 hover:bg-white/10 hover:text-white"
const itemActive = "font-medium text-white"

function Underline({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-x-2.5 -bottom-px h-0.5 rounded-full transition-colors ${
        active ? "bg-white" : "bg-transparent"
      }`}
    />
  )
}

function DropdownNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    if (open) setOpen(false)
  }

  return (
    <div
      ref={ref}
      className="relative self-stretch flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-expanded={open}
        className={`${itemBase} ${active ? itemActive : itemInactive}`}
      >
        <span className="truncate">{item.label}</span>
        <ChevronDown
          className={`size-3 shrink-0 opacity-60 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
        <Underline active={active} />
      </Link>

      {open && (
        <div className="absolute top-full left-0 z-50 min-w-44 overflow-hidden bg-[var(--brand)]">
          <div className="border-t border-white/20" />
          <div className="py-1">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm font-medium text-white/80 transition-colors
                  hover:bg-white/10 hover:text-white"
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function HeaderNav({ items }: Props) {
  const pathname = usePathname()

  return (
    <nav className="hidden self-stretch items-stretch gap-1 md:flex" aria-label="Main">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

        if (item.children?.length) {
          return <DropdownNavItem key={item.href} item={item} active={active} />
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`self-center ${itemBase} ${active ? itemActive : itemInactive}`}
          >
            <span className="truncate">{item.label}</span>
            {item.badge ? (
              <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white/25
                px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
            <Underline active={active} />
          </Link>
        )
      })}
    </nav>
  )
}
