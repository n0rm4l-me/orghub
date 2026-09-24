"use client"

import { useLayoutEffect } from "react"
import { applyTheme, type Theme } from "@/components/theme-toggle"
import { applyFontSize, type FontSize } from "@/components/font-size-toggle"

/**
 * The root layout's blocking script sets theme/font-size classes on <html> once
 * per full document load, and deliberately skips /admin. Because admin and the
 * portal share that same root layout, a client-side navigation between them
 * doesn't remount <html>, so those classes go stale until the next hard
 * refresh. Re-apply on every mount so entering the portal from admin self-heals
 * immediately instead of showing admin's stripped-down defaults.
 */
export function PortalAppearanceSync() {
  useLayoutEffect(() => {
    const theme = (localStorage.getItem("theme") as Theme | null) ?? "system"
    applyTheme(theme)
    const fontSize = (localStorage.getItem("fontSize") as FontSize | null) ?? "md"
    applyFontSize(fontSize)
  }, [])
  return null
}
