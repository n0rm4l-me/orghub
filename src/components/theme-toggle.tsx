"use client"

import { useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"

type Theme = "light" | "system" | "dark"

function applyTheme(t: Theme) {
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
    <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700/60">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => pick(opt.value)}
          className={`flex flex-1 flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium transition-colors
            ${theme === opt.value
              ? "bg-white text-gray-700 shadow-sm dark:bg-gray-600 dark:text-gray-100"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
