"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Search, ChevronRight } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FontSizeToggle } from "@/components/font-size-toggle"
import { PortalWidthPills } from "@/components/portal-width"

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

export function MobileMenu({ items }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onTouchEnd={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        className="grid size-11 place-items-center rounded-lg text-white/70 transition
          hover:bg-white/15 hover:text-white touch-manipulation md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 top-14 z-30 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 top-14 z-40 bg-brand shadow-2xl md:hidden">
            <form action="/" method="get" role="search" className="border-b border-white/15 p-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60"
                  aria-hidden
                />
                <input
                  type="search"
                  name="q"
                  placeholder="Search news"
                  aria-label="Search news"
                  className="w-full rounded-lg border border-white/15 bg-white/10 py-2.5 pl-9 pr-4
                    text-base text-white placeholder:text-white/60 focus:outline-none focus:ring-2
                    focus:ring-white/40"
                />
              </div>
            </form>

            <nav aria-label="Mobile" className="max-h-[calc(100dvh-112px)] overflow-y-auto p-2 pb-6">
              {items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-4 py-3 text-base
                        font-medium transition
                        ${active
                          ? "bg-white/15 text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        {item.label}
                        {item.badge ? (
                          <span className="inline-flex items-center justify-center rounded-full
                            bg-white/25 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </span>
                      {item.children?.length ? (
                        <ChevronRight className="size-4 text-white/40" aria-hidden />
                      ) : null}
                    </Link>

                    {item.children?.map((child) => {
                      const childActive = pathname.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`flex items-center rounded-xl py-2.5 pl-10 pr-4 text-sm
                            transition
                            ${childActive
                              ? "font-medium text-white"
                              : "text-white/60 hover:bg-white/10 hover:text-white/90"
                            }`}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </div>
                )
              })}
            </nav>

            <div className="border-t border-white/15 px-4 py-4">
              <div className="rounded-xl bg-black/20 p-3 space-y-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">Theme</p>
                  <ThemeToggle />
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">Text size</p>
                  <FontSizeToggle />
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">Page width</p>
                  <PortalWidthPills />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
