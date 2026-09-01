"use client"

import { useEffect, useState } from "react"
import { getMealStatus, type MealStatusInfo } from "@/lib/dining-hours"

interface Props {
  hours: string | null
  timezone: string
  /** Server-computed initial value — avoids an empty first paint and layout shift. */
  initial: MealStatusInfo
}

export function MealStatusBadge({ hours, timezone, initial }: Props) {
  const [info, setInfo] = useState<MealStatusInfo>(initial)

  useEffect(() => {
    if (!hours) return
    const id = setInterval(() => setInfo(getMealStatus(hours, timezone)), 60_000)
    return () => clearInterval(id)
  }, [hours, timezone])

  if (!hours || info.status === null) return null

  if (info.status === "open") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Open now
      </span>
    )
  }
  if (info.status === "upcoming") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
        Opens {info.opensAt}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500">
      Ended
    </span>
  )
}
