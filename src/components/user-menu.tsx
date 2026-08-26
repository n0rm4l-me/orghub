"use client"

import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { LayoutDashboard, LogOut, ChevronDown } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import { FontSizeToggle } from "@/components/font-size-toggle"
import { PortalWidthPills } from "@/components/portal-width"

interface Props {
  initials: string
  gravatarUrl?: string
  name: string
  canAdmin: boolean
  signOutAction: () => Promise<void>
}

export function UserMenu({ initials, gravatarUrl, name, canAdmin, signOutAction }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
      >
        <Avatar className="size-7 shrink-0">
          {gravatarUrl && <AvatarImage src={gravatarUrl} alt="" />}
          <AvatarFallback className="bg-white/20 text-[11px] font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[130px] truncate text-sm text-white/85 lg:block">{name}</span>
        <ChevronDown
          className={`hidden size-3.5 text-white/60 transition-transform lg:block ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-56 overflow-hidden rounded-xl border
            border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {canAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700
                transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <LayoutDashboard className="size-4 text-gray-400" aria-hidden />
              Admin panel
            </Link>
          )}
          <div className="border-t border-gray-100 px-3 py-2.5 dark:border-gray-700">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Theme</p>
            <ThemeToggle />
          </div>
          <div className="border-t border-gray-100 px-3 py-2.5 dark:border-gray-700">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Size</p>
            <FontSizeToggle />
          </div>
          <div className="border-t border-gray-100 px-3 py-2.5 dark:border-gray-700">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Width</p>
            <PortalWidthPills />
          </div>
          <form action={signOutAction} className="border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700
                transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <LogOut className="size-4 text-gray-400" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
