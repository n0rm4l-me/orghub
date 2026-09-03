"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Search, ChevronRight } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FontSizeToggle } from "@/components/font-size-toggle"

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
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    if (open) setOpen(false)
  }

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

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-brand md:hidden">
          {/* Top bar — mirrors the header height */}
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <span className="text-base font-semibold text-white">Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-11 place-items-center rounded-lg text-white/70 transition
                hover:bg-white/15 hover:text-white touch-manipulation"
              aria-label="Close menu"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {/* Search */}
          <div className="shrink-0 border-b border-white/15 px-4 pb-4">
            <form action="/" method="get" role="search">
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
          </div>

          {/* Nav + settings — scrollable */}
          <nav aria-label="Mobile" className="flex-1 overflow-y-auto bg-brand overscroll-contain p-2 pb-6">
            {items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-base
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
                        className={`flex items-center rounded-xl py-3 pl-10 pr-4 text-sm
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

            <div className="mt-2 border-t border-white/15 pt-4 px-2 pb-2">
              <div className="rounded-xl bg-black/20 p-4 space-y-4">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/50">Theme</p>
                  <ThemeToggle />
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/50">Text size</p>
                  <FontSizeToggle />
                </div>
              </div>
            </div>
          </nav>
        </div>,
        document.body
      )}
    </>
  )
}
