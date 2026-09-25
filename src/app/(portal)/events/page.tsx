import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { ChevronLeft, ChevronRight, CalendarDays, MapPin } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { PortalPageLayout } from "@/components/portal-page-layout"
import { PageHeader } from "@/components/ui/page-header"

interface Props {
  searchParams: Promise<{ month?: string }>
}

function parseMonth(raw?: string): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number)
    if (m >= 1 && m <= 12) return { year: y, month: m }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export async function generateMetadata() {
  return { title: "Calendar" }
}

export default async function EventsPage({ searchParams }: Props) {
  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("events")) notFound()

  const sp = await searchParams
  const { year, month } = parseMonth(sp.month)

  const eventsLayout = settings.eventsLayout ?? "content"

  const pollsEnabled = enabled.has("polls")
  const kudosEnabled = enabled.has("kudos")

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 1)

  const events = await db.article.findMany({
    where: { published: true, eventDate: { gte: monthStart, lt: monthEnd } },
    orderBy: { eventDate: "asc" },
    select: { id: true, title: true, eventDate: true, eventEndDate: true, eventLocation: true },
  })

  // Calendar grid
  const firstDow = monthStart.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalCells = Math.ceil((firstDow + daysInMonth) / 7) * 7
  const cells: (number | null)[] = Array(totalCells).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells[firstDow + d - 1] = d

  const byDay = new Map<number, typeof events>()
  for (const ev of events) {
    const day = new Date(ev.eventDate!).getDate()
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(ev)
  }

  const prev = prevMonth(year, month)
  const next = nextMonth(year, month)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  const content = (
    <div className="space-y-8">
      <PageHeader
        title="Calendar"
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/events?month=${monthKey(prev.year, prev.month)}`}
              className="grid size-8 place-items-center rounded-lg border border-border bg-card
                text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-[10rem] text-center text-sm font-semibold text-foreground">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Link
              href={`/events?month=${monthKey(next.year, next.month)}`}
              className="grid size-8 place-items-center rounded-lg border border-border bg-card
                text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = isCurrentMonth && day === today.getDate()
            const dayEvents = day ? (byDay.get(day) ?? []) : []
            const isLast = idx >= cells.length - 7
            return (
              <div
                key={idx}
                className={`min-h-[80px] border-b border-r border-border p-1.5
                  ${isLast ? "border-b-0" : ""}
                  ${idx % 7 === 6 ? "border-r-0" : ""}
                  ${!day ? "bg-muted/50" : ""}`}
              >
                {day && (
                  <>
                    <div className={`mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium
                      ${isToday ? "bg-brand text-white" : "text-foreground"}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <Link
                          key={ev.id}
                          href={`/articles/${ev.id}`}
                          title={ev.title}
                          className="block truncate rounded bg-brand/10 px-1.5 py-0.5 text-[11px]
                            font-medium text-brand transition hover:bg-brand/20"
                        >
                          {ev.title}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="px-1 text-[11px] text-muted-foreground">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Event list */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {events.length > 0
            ? `${events.length} event${events.length === 1 ? "" : "s"} in ${MONTH_NAMES[month - 1]}`
            : `No events in ${MONTH_NAMES[month - 1]}`}
        </h2>
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <CalendarDays className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No events scheduled this month.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const start = new Date(ev.eventDate!)
              const end = ev.eventEndDate ? new Date(ev.eventEndDate) : null
              const sameDay = end && start.toDateString() === end.toDateString()
              const dateLabel = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
              const timeLabel = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              const endTimeLabel = end ? end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null
              const endDateLabel = end && !sameDay
                ? end.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                : null
              return (
                <Link
                  key={ev.id}
                  href={`/articles/${ev.id}`}
                  className="group flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4
                    transition hover:border-brand/30 hover:bg-brand/5
                    dark:hover:border-brand/40"
                >
                  <div className="shrink-0 w-12 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                      {start.toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="text-2xl font-bold leading-none text-foreground">
                      {start.getDate()}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground group-hover:text-brand transition">
                      {ev.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3 shrink-0" aria-hidden />
                        {dateLabel} · {timeLabel}
                        {endTimeLabel && sameDay && ` – ${endTimeLabel}`}
                        {endDateLabel && ` – ${endDateLabel} ${endTimeLabel}`}
                      </span>
                      {ev.eventLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 shrink-0" aria-hidden />
                          {ev.eventLocation}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <PortalPageLayout
      layout={eventsLayout}
      sidebarOrder={settings.sidebarOrder}
      leftSidebarOrder={settings.leftSidebarOrder}
      eventsEnabled={true}
      pollsEnabled={pollsEnabled}
      kudosEnabled={kudosEnabled}
      gravatarsEnabled={settings.gravatarsEnabled}
    >
      {content}
    </PortalPageLayout>
  )
}
