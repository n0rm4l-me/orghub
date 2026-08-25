"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface Props {
  items: { href: string; label: string }[]
}

/**
 * Top navigation with an underline on the current section.
 *
 * The underline is always rendered and only its colour changes, so switching
 * pages cannot shift the row by the 2px of a border appearing.
 */
export function HeaderNav({ items }: Props) {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              active ? "font-medium text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="truncate">{item.label}</span>
            <span
              aria-hidden
              className={`absolute inset-x-2.5 -bottom-px h-0.5 rounded-full transition-colors ${
                active ? "bg-white" : "bg-transparent"
              }`}
            />
          </Link>
        )
      })}
    </nav>
  )
}
