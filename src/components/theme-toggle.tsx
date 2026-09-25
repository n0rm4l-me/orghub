"use client"

import { useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"

export type Theme = "light" | "system" | "dark"

export function applyTheme(t: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  if (t === "dark" || (t === "system" && prefersDark)) {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
  localStorage.setItem("theme", t)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system"
    const saved = localStorage.getItem("theme") as Theme | null
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system"
  })

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    function onSystem() {
      if ((localStorage.getItem("theme") ?? "system") === "system") applyTheme("system")
    }
    mq.addEventListener("change", onSystem)
    return () => mq.removeEventListener("change", onSystem)
  }, [])

  function pick(t: Theme) {
    setTheme(t)
    applyTheme(t)
  }

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="size-3.5" />, label: "Light" },
    { value: "system", icon: <Monitor className="size-3.5" />, label: "System" },
    { value: "dark", icon: <Moon className="size-3.5" />, label: "Dark" },
  ]

  return (
    <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => pick(opt.value)}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium transition-colors
            ${theme === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-muted-foreground"
            }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
