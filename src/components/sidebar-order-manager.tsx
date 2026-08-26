"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Zap, Tag, CalendarDays } from "lucide-react"
import { saveSidebarWidgets } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"
import { Panel } from "@/components/ui/field"
import type { LucideIcon } from "lucide-react"

const BLOCKS: { id: string; label: string; description: string; icon: LucideIcon; moduleId?: string }[] = [
  { id: "quickLinks", label: "Quick links", description: "External shortcuts", icon: Zap },
  { id: "browseByTopic", label: "Browse by topic", description: "Category filter pills", icon: Tag },
  { id: "upcomingEvents", label: "Upcoming events", description: "Next calendar events (Events module)", icon: CalendarDays, moduleId: "events" },
]

interface Props {
  initialOrder: string[]
  enabledModules: Set<string>
}

export function SidebarOrderManager({ initialOrder, enabledModules }: Props) {
  const [order, setOrder] = useState(initialOrder)
  const { run, pending } = useAction((order: string[]) => saveSidebarWidgets(order, []))

  function move(idx: number, dir: "up" | "down") {
    const next = [...order]
    const swap = dir === "up" ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setOrder(next)
    run(next)
  }

  const base =
    "grid size-5 place-items-center rounded text-gray-400 transition " +
    "enabled:hover:bg-gray-100 enabled:hover:text-gray-700 disabled:opacity-25"

  return (
    <Panel
      title="Sidebar sections"
      description="Order in which the three sections appear in the feed sidebar."
    >
      <ul className="divide-y divide-gray-100">
        {order.map((id, idx) => {
          const block = BLOCKS.find((b) => b.id === id)
          if (!block) return null
          if (block.moduleId && !enabledModules.has(block.moduleId)) return null
          const Icon = block.icon
          return (
            <li key={id} className="flex items-center gap-3 py-2.5">
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, "up")}
                  disabled={idx === 0 || pending}
                  aria-label={`Move ${block.label} up`}
                  className={base}
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, "down")}
                  disabled={idx === order.length - 1 || pending}
                  aria-label={`Move ${block.label} down`}
                  className={base}
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>

              <Icon className="size-4 shrink-0 text-brand" aria-hidden />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{block.label}</p>
                <p className="text-xs text-gray-400">{block.description}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
