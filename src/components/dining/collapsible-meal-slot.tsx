"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getMealStatus } from "@/lib/dining-hours"

export function CollapsibleMealSlot({
  name,
  hours,
  timezone,
  isWeekday,
  badge,
  children,
}: {
  name: string
  hours: string | null
  timezone: string
  isWeekday: boolean
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(
    () => isWeekday && getMealStatus(hours, timezone).status === "ended"
  )

  return (
    <div>
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        {collapsed
          ? <ChevronRight className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
          : <ChevronDown className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
        }
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{name}</span>
        {badge}
        {collapsed && (
          <span className="ml-auto text-[10px] italic text-gray-300 dark:text-gray-600">tap to expand</span>
        )}
      </button>
      {!collapsed && children}
    </div>
  )
}
