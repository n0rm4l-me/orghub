"use client"

import { useState, useRef, useEffect } from "react"
import { SlidersHorizontal } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { FontSizeToggle } from "@/components/font-size-toggle"
import { PortalWidthPills } from "@/components/portal-width"

export function CustomizeMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Customize appearance"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-lg text-white/70 transition
          hover:bg-white/15 hover:text-white"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-gray-200
          bg-white p-3 shadow-2xl space-y-3 dark:border-white/10 dark:bg-gray-900">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/50">
              Theme
            </p>
            <ThemeToggle />
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/50">
              Text size
            </p>
            <FontSizeToggle />
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/50">
              Page width
            </p>
            <PortalWidthPills />
          </div>
        </div>
      )}
    </div>
  )
}
