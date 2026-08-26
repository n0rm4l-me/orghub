"use client"

import { useState } from "react"
import { Loader2, ArrowUp, ArrowDown } from "lucide-react"
import { saveSidebarWidgets } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"
import { Panel } from "@/components/ui/field"
import type { ModuleId } from "@/lib/modules"

type Placement = "off" | "left" | "right"

interface Widget {
  id: string
  label: string
  requiresModule?: ModuleId
}

const ALL_WIDGETS: Widget[] = [
  { id: "quickLinks",      label: "Quick links" },
  { id: "browseByTopic",   label: "Browse by topic" },
  { id: "upcomingEvents",  label: "Upcoming events", requiresModule: "events" },
  { id: "activePolls",     label: "Active poll",     requiresModule: "polls" },
]

interface WidgetRow {
  id: string
  placement: Placement
}

interface Props {
  rightOrder: string[]
  leftOrder: string[]
  enabledModules: Set<ModuleId>
}

export function SidebarWidgetsForm({ rightOrder, leftOrder, enabledModules }: Props) {
  const { run, pending } = useAction(saveSidebarWidgets)

  const initialRows = (): WidgetRow[] => {
    const rows: WidgetRow[] = []
    for (const id of [...leftOrder, ...rightOrder]) {
      const placement: Placement = leftOrder.includes(id) ? "left" : "right"
      if (!rows.find((r) => r.id === id)) rows.push({ id, placement })
    }
    for (const w of ALL_WIDGETS) {
      if (!rows.find((r) => r.id === w.id)) rows.push({ id: w.id, placement: "off" })
    }
    return rows
  }

  const [rows, setRows] = useState<WidgetRow[]>(initialRows)

  const move = (index: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const setPlacement = (id: string, placement: Placement) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, placement } : r)))
  }

  const handleSubmit = () => {
    const right = rows.filter((r) => r.placement === "right").map((r) => r.id)
    const left  = rows.filter((r) => r.placement === "left").map((r) => r.id)
    run(right, left)
  }

  return (
    <Panel
      title="Sidebar widgets"
      description="Select which widgets appear in each sidebar and in what order."
      footer={
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2
            text-sm font-medium text-white transition hover:brightness-95 active:brightness-90
            disabled:opacity-60"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Save widgets
        </button>
      }
    >
      <div className="divide-y divide-gray-100">
        {rows.map((row, i) => {
          const widget = ALL_WIDGETS.find((w) => w.id === row.id)!
          if (widget.requiresModule && !enabledModules.has(widget.requiresModule)) return null
          return (
            <div key={row.id} className="flex items-center gap-3 py-3">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="grid size-5 place-items-center rounded text-gray-300 transition
                    hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-0"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  aria-label="Move down"
                  className="grid size-5 place-items-center rounded text-gray-300 transition
                    hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-0"
                >
                  <ArrowDown className="size-3" />
                </button>
              </div>

              <span className="flex-1 text-sm font-medium text-gray-800">{widget.label}</span>

              <div className="flex rounded-lg border border-gray-200 text-xs font-medium overflow-hidden">
                {(["off", "left", "right"] as Placement[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlacement(row.id, p)}
                    className={`px-3 py-1.5 capitalize transition ${
                      row.placement === p
                        ? "bg-brand text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
