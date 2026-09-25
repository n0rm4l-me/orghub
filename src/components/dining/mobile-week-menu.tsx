"use client"

import { useState } from "react"
import { Ban } from "lucide-react"
import { SafeImg } from "@/components/dining/safe-img"

export type MobileEntry = {
  name: string | null
  description: string | null
  photo: string | null
  featured: string | null
  macros: string | null
  tags: Array<{ id: string; name: string; color: string; bgColor: string }>
  note: string | null
}

export type MobileDay = {
  key: string
  label: string
  closed: boolean
  isToday: boolean
  rows: Array<{ catId: string; catName: string; entry: MobileEntry | null }>
}

export function MobileWeekMenu({ days }: { days: MobileDay[] }) {
  const initial = days.findIndex((d) => d.isToday)
  const [active, setActive] = useState(initial >= 0 ? initial : 0)
  const day = days[active]
  if (!day) return null

  const hasAny = day.rows.some((r) => r.entry)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Day selector */}
      <div className="flex border-b border-border" role="tablist">
        {days.map((d, i) => (
          <button
            key={d.key}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`flex-1 px-1 py-2 text-center transition-colors ${
              i === active
                ? "bg-brand/5 dark:bg-brand/10"
                : "hover:bg-muted"
            }`}
          >
            <span
              className={`block text-xs font-semibold ${
                i === active
                  ? "text-brand"
                  : d.closed
                    ? "text-muted-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {d.label}
            </span>
          </button>
        ))}
      </div>

      {/* Selected day content */}
      {day.closed ? (
        <div className="flex min-h-[140px] items-center justify-center bg-muted bg-[image:repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(220,38,38,.06)_10px,rgba(220,38,38,.06)_11px)] dark:bg-[image:repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(248,113,113,.04)_10px,rgba(248,113,113,.04)_11px)]">
          <span className="inline-flex items-center gap-1.5 rounded bg-card/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-red-400">
            <Ban className="size-3.5" aria-hidden />
            Closed
          </span>
        </div>
      ) : !hasAny ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {day.rows.map((row) => (
            <li key={row.catId} className="px-4 py-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {row.catName}
              </p>
              {row.entry ? (
                <div className="flex gap-3">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <SafeImg src={row.entry.photo} alt="" className="size-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-foreground">
                      {row.entry.name ?? row.entry.description}
                    </p>
                    {row.entry.name && row.entry.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.entry.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {row.entry.featured && (
                        <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                          {row.entry.featured}
                        </span>
                      )}
                      {row.entry.tags.map((t) => (
                        <span
                          key={t.id}
                          className="venue-tag rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ "--tag-color": t.color, "--tag-bg": t.bgColor } as React.CSSProperties}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                    {row.entry.macros && (
                      <p className="mt-1 text-[10px] text-muted-foreground">{row.entry.macros}</p>
                    )}
                    {row.entry.note && (
                      <p className="mt-1 text-[11px] italic text-muted-foreground">{row.entry.note}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
