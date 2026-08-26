"use client"

import { ChevronUp, ChevronDown } from "lucide-react"
import { movePage } from "@/lib/actions/nav"
import { useAction } from "@/lib/use-action"

export function PageReorder({
  pageId,
  label,
  isFirst,
  isLast,
}: {
  pageId: string
  label: string
  isFirst: boolean
  isLast: boolean
}) {
  const move = useAction(movePage)
  const base =
    "grid size-5 place-items-center rounded text-gray-400 transition enabled:hover:bg-gray-100 " +
    "enabled:hover:text-gray-700 disabled:opacity-25"

  return (
    <div className="flex shrink-0 flex-col" aria-hidden={move.pending}>
      <button
        type="button"
        onClick={() => move.run(pageId, "up")}
        disabled={isFirst || move.pending}
        aria-label={`Move ${label} up`}
        className={base}
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => move.run(pageId, "down")}
        disabled={isLast || move.pending}
        aria-label={`Move ${label} down`}
        className={base}
      >
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  )
}
