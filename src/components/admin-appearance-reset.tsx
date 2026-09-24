"use client"

import { useLayoutEffect } from "react"

/**
 * Mirrors the root layout's blocking script, which skips /admin so the admin
 * console always renders in light mode at default font size. That script only
 * runs once per full document load, so a client-side navigation from the
 * portal (where dark mode / font size classes may be set) into /admin leaves
 * those classes stale on <html> until the next hard refresh. Strip them on
 * mount to self-heal immediately.
 */
export function AdminAppearanceReset() {
  useLayoutEffect(() => {
    document.documentElement.classList.remove("dark", "font-sm", "font-lg")
  }, [])
  return null
}
