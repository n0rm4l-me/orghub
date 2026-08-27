"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ArrowUpRight, LogOut } from "lucide-react"
import { AdminNav } from "@/components/admin-nav"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Props {
  canAdminister: boolean
  eventsEnabled: boolean
  pollsEnabled: boolean
  kudosEnabled?: boolean
  userName: string
  userRole: string
  gravatarUrl?: string
  signOutAction: () => Promise<void>
  siteName: string
}

export function AdminMobileSidebar({
  canAdminister,
  eventsEnabled,
  pollsEnabled,
  kudosEnabled,
  userName,
  userRole,
  gravatarUrl,
  signOutAction,
  siteName,
}: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const initials =
    userName
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/5
        bg-gray-900 px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center rounded-lg text-gray-400 transition
            hover:bg-white/10 hover:text-white touch-manipulation"
          aria-label="Open admin menu"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <span className="text-sm font-medium text-white">{siteName} Admin</span>
      </div>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Drawer */}
          <div className="relative flex w-72 flex-col bg-gray-900">
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 px-4">
              <span className="text-sm font-semibold text-white">Admin</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-gray-400 transition
                  hover:bg-white/10 hover:text-white touch-manipulation"
                aria-label="Close menu"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {/* Nav */}
            <AdminNav
              canAdminister={canAdminister}
              eventsEnabled={eventsEnabled}
              pollsEnabled={pollsEnabled}
              kudosEnabled={kudosEnabled}
            />

            {/* Bottom: view portal + user */}
            <div className="shrink-0 border-t border-white/5 p-3">
              <Link
                href="/"
                className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400
                  transition-colors hover:bg-white/5 hover:text-white"
              >
                <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                View portal
              </Link>

              <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
                <Avatar className="size-7 shrink-0">
                  {gravatarUrl && <AvatarImage src={gravatarUrl} alt="" />}
                  <AvatarFallback className="bg-brand text-[11px] font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{userName}</p>
                  <p className="text-[11px] text-gray-500 capitalize">{userRole.toLowerCase()}</p>
                </div>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    title="Sign out"
                    aria-label="Sign out"
                    className="grid size-7 place-items-center rounded-md text-gray-500
                      transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <LogOut className="size-3.5" aria-hidden />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
