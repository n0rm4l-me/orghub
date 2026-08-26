"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ChevronsLeftRight } from "lucide-react"

const WIDTHS = ["narrow", "default", "wide"] as const
type Width = (typeof WIDTHS)[number]

const WIDTH_CLASSES: Record<Width, string> = {
  narrow: "max-w-5xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
}

const WIDTH_LABELS: Record<Width, string> = {
  narrow: "Narrow (1024px)",
  default: "Default (1152px)",
  wide: "Wide (1280px)",
}

const Ctx = createContext<{ width: Width; cycle: () => void }>({
  width: "default",
  cycle: () => {},
})

function toWidth(raw: string): Width {
  return WIDTHS.includes(raw as Width) ? (raw as Width) : "default"
}

export function PortalWidthProvider({
  defaultWidth,
  children,
}: {
  defaultWidth: string
  children: React.ReactNode
}) {
  const [width, setWidth] = useState<Width>(toWidth(defaultWidth))

  useEffect(() => {
    const stored = localStorage.getItem("portal-width")
    if (stored) setWidth(toWidth(stored))
  }, [])

  const cycle = () => {
    const next = WIDTHS[(WIDTHS.indexOf(width) + 1) % WIDTHS.length]!
    localStorage.setItem("portal-width", next)
    setWidth(next)
  }

  return <Ctx.Provider value={{ width, cycle }}>{children}</Ctx.Provider>
}

export function PortalMain({ children }: { children: React.ReactNode }) {
  const { width } = useContext(Ctx)
  return (
    <main id="main" className={`mx-auto ${WIDTH_CLASSES[width]} px-4 py-8 sm:px-6`}>
      {children}
    </main>
  )
}

export function HeaderContainer({ children }: { children: React.ReactNode }) {
  const { width } = useContext(Ctx)
  return (
    <div className={`mx-auto flex h-14 ${WIDTH_CLASSES[width]} items-center gap-5 px-4 sm:px-6`}>
      {children}
    </div>
  )
}

export function WidthToggle() {
  const { width, cycle } = useContext(Ctx)
  return (
    <button
      type="button"
      onClick={cycle}
      title={WIDTH_LABELS[width]}
      className="grid size-8 place-items-center rounded-lg text-white/70 transition
        hover:bg-white/15 hover:text-white"
    >
      <ChevronsLeftRight className="size-4" aria-hidden />
      <span className="sr-only">Portal width: {WIDTH_LABELS[width]}</span>
    </button>
  )
}
