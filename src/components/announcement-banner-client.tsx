"use client"

import { useState } from "react"
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
  const set = getDismissed()
  set.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export function AnnouncementBannerClient({ announcement }: { announcement: Announcement }) {
  const [visible, setVisible] = useState(() => !getDismissed().has(announcement.id))

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
          onClick={() => { addDismissed(announcement.id); setVisible(false) }}
          aria-label="Dismiss announcement"
          className={`shrink-0 rounded-md p-1 transition ${theme.close}`}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
