"use client"

import { useState } from "react"

export type FontSize = "sm" | "md" | "lg"

export function applyFontSize(f: FontSize) {
  document.documentElement.classList.remove("font-sm", "font-lg")
  if (f === "sm") document.documentElement.classList.add("font-sm")
  else if (f === "lg") document.documentElement.classList.add("font-lg")
  localStorage.setItem("fontSize", f)
}

const options: { value: FontSize; label: string; cls: string }[] = [
  { value: "sm", label: "Small", cls: "text-[11px] leading-none font-bold" },
  { value: "md", label: "Default", cls: "text-sm leading-none font-bold" },
  { value: "lg", label: "Large", cls: "text-base leading-none font-bold" },
]

export function FontSizeToggle() {
  const [size, setSize] = useState<FontSize>(() => {
    if (typeof window === "undefined") return "md"
    const saved = localStorage.getItem("fontSize") as FontSize | null
    return saved === "sm" || saved === "md" || saved === "lg" ? saved : "md"
  })

  function pick(f: FontSize) {
    setSize(f)
    applyFontSize(f)
  }

  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => pick(opt.value)}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium transition-colors
            ${size === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-muted-foreground"
            }`}
        >
          <span className={opt.cls}>A</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
