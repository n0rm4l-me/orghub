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

const Ctx = createContext<{ width: Width; cycle: () => void; set: (w: Width) => void }>({
  width: "default",
  cycle: () => {},
  set: () => {},
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

  const set = (w: Width) => {
    localStorage.setItem("portal-width", w)
    setWidth(w)
  }

  return <Ctx.Provider value={{ width, cycle, set }}>{children}</Ctx.Provider>
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

const WIDTH_ICONS: Record<Width, React.ReactNode> = {
  narrow: (
    <svg viewBox="0 0 20 10" className="w-5 h-2.5" fill="currentColor" aria-hidden>
      <rect x="4" y="0" width="12" height="10" rx="1" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 20 10" className="w-5 h-2.5" fill="currentColor" aria-hidden>
      <rect x="2" y="0" width="16" height="10" rx="1" />
    </svg>
  ),
  wide: (
    <svg viewBox="0 0 20 10" className="w-5 h-2.5" fill="currentColor" aria-hidden>
      <rect x="0" y="0" width="20" height="10" rx="1" />
    </svg>
  ),
}

export function PortalWidthPills() {
  const { width, set } = useContext(Ctx)

  const options: { value: Width; label: string }[] = [
    { value: "narrow", label: "Narrow" },
    { value: "default", label: "Default" },
    { value: "wide", label: "Wide" },
  ]

  return (
    <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700/60">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => set(opt.value)}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium transition-colors
            ${width === opt.value
              ? "bg-white text-gray-700 shadow-sm dark:bg-gray-600 dark:text-gray-100"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
        >
          {WIDTH_ICONS[opt.value]}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
