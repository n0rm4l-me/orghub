"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"

type Announcement = {
  id: string
  message: string
  linkUrl: string | null
  linkLabel: string | null
  color: string
}

const COLORS: Record<string, { bar: string; bg: string; text: string; close: string }> = {
  brand:   { bar: "bg-brand",       bg: "bg-brand/5 border-brand/20",   text: "text-brand",       close: "hover:bg-brand/10" },
  amber:   { bar: "bg-amber-400",   bg: "bg-amber-50 border-amber-200",  text: "text-amber-700",   close: "hover:bg-amber-100" },
  red:     { bar: "bg-red-500",     bg: "bg-red-50 border-red-200",      text: "text-red-700",     close: "hover:bg-red-100" },
  emerald: { bar: "bg-emerald-500", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", close: "hover:bg-emerald-100" },
}

const STORAGE_KEY = "orghub_dismissed_announcements"

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"))
  } catch {
    return new Set()
  }
}

function addDismissed(id: string) {
  // Best-effort: some browsers/settings throw on setItem (private-browsing
  // storage caps, storage disabled by policy, quota). Remembering the
  // dismissal is a nice-to-have; letting that failure block the visible
  // dismiss itself (see dismiss() below, which calls this first) is not.
  try {
    const set = getDismissed()
    set.add(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // Not persisted: the banner will come back on the next load. Still
    // better than the click appearing to do nothing at all.
  }
}

// A client-side navigation into a page whose route has no loading.tsx can
// leave a previous instance of this component mounted (seen live with the
// same mechanism on /admin: Next.js holding the old page through the
// transition -- see admin-appearance-reset.tsx). If that happens on two
// portal pages back to back, two instances of this banner can end up
// mounted at once; dismissing one via its own setVisible would leave the
// other sitting there looking like the button did nothing. Every mounted
// instance registers its setter here, so dismissing any one dismisses all
// of them for that announcement id, not just the one that was clicked.
const listeners = new Map<string, Set<(v: boolean) => void>>()

function dismiss(id: string) {
  // Hide first: the visible effect must never depend on persistence
  // succeeding. addDismissed can't throw (see its own try/catch), but the
  // order itself is the actual guarantee, not that catch.
  for (const setVisible of listeners.get(id) ?? []) setVisible(false)
  addDismissed(id)
}

export function AnnouncementBannerClient({ announcement }: { announcement: Announcement }) {
  const [visible, setVisible] = useState(() => !getDismissed().has(announcement.id))
  const pathname = usePathname()

  useEffect(() => {
    const id = announcement.id
    const set = listeners.get(id) ?? new Set()
    set.add(setVisible)
    listeners.set(id, set)
    return () => {
      set.delete(setVisible)
      if (set.size === 0) listeners.delete(id)
    }
  }, [announcement.id])

  // usePathname() re-renders on every navigation even if this component's
  // own instance somehow survives one (seen live: a client-side transition
  // from the portal into /admin, which has no loading.tsx, left this banner
  // on screen until a hard refresh). Belt-and-suspenders: this component
  // should never render on admin regardless of whether its portal-only
  // parent layout actually unmounted.
  if (pathname?.startsWith("/admin")) return null
  if (!visible) return null

  const theme = COLORS[announcement.color] ?? COLORS.brand

  return (
    <div
      role="status"
      className={`relative border-b ${theme.bg}`}
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 ${theme.bar}`} aria-hidden />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <p className={`min-w-0 flex-1 text-sm font-medium ${theme.text}`}>
          {announcement.message}
          {announcement.linkUrl && (
            <a
              href={announcement.linkUrl}
              className="ml-2 underline underline-offset-2 opacity-80 hover:opacity-100"
              target={announcement.linkUrl.startsWith("/") ? undefined : "_blank"}
              rel={announcement.linkUrl.startsWith("/") ? undefined : "noopener noreferrer"}
            >
              {announcement.linkLabel || "Learn more"} →
            </a>
          )}
        </p>
        <button
          type="button"
          onClick={() => dismiss(announcement.id)}
          aria-label="Dismiss announcement"
          className={`shrink-0 rounded-md p-1 transition ${theme.close}`}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
