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
    // Admin's "tabs" are ?tab= links that reload the page with different
    // content heights, so the scrollbar appears/disappears between them and
    // shifts everything sideways by its width. Reserving the gutter fixes
    // that; see the html.admin-scrollbar-stable rule in globals.css for why
    // this is safe here but not in the portal.
    document.documentElement.classList.add("admin-scrollbar-stable")
    return () => document.documentElement.classList.remove("admin-scrollbar-stable")
  }, [])
  return null
}
