import { Suspense } from "react"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { SidebarBlocks } from "@/components/sidebar-blocks"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { getMealStatus } from "@/lib/dining-hours"
import { MealStatusBadge } from "@/components/dining/meal-status-badge"
import { CollapsibleMealSlot } from "@/components/dining/collapsible-meal-slot"
import { MobileWeekMenu, type MobileDay } from "@/components/dining/mobile-week-menu"
import { FixedMenuView } from "@/components/dining/fixed-menu-view"
import { CartProvider } from "@/lib/cart"
import { CartWidget } from "@/components/dining/cart-widget"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ menu?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const venue = await db.venue.findUnique({ where: { id }, select: { name: true } })
  return { title: venue ? `${venue.name} – Dining` : "Dining" }
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"] as const
type Day = typeof DAYS[number]
// 0=Sun, 1=Mon...5=Fri, 6=Sat
const WEEKDAY_TO_DAY: Array<Day | null> = [null, "MON", "TUE", "WED", "THU", "FRI", null]

export default async function DiningVenuePage({ params, searchParams }: Props) {
  const { id } = await params
  const { menu: menuParam } = await searchParams

  // All reads are independent — run in parallel.
  const [settings, venue, publishedMenus, topic] = await Promise.all([
    getSettings(),
    db.venue.findUnique({
      where: { id },
      include: {
        location: { select: { timezone: true } },
        categories: { orderBy: { order: "asc" } },
        mealSlots: { orderBy: { order: "asc" } },
        venueTags: { orderBy: { order: "asc" } },
        nutritionParams: { orderBy: { order: "asc" } },
      },
    }),
    db.weekMenu.findMany({
      where: { venueId: id, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      include: {
        entries: {
          include: { dish: { select: { photo: true, nutrition: true, tagIds: true } } },
          orderBy: [{ day: "asc" as const }],
        },
        fixedSections: {
          orderBy: { order: "asc" },
          include: {
            entries: {
              orderBy: { order: "asc" },
              include: {
                modifierGroups: {
                  orderBy: { order: "asc" },
                  include: { options: { orderBy: { order: "asc" } } },
                },
              },
            },
          },
        },
      },
    }),
    db.monthlyTopic.findFirst({
      where: { venueId: id, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true, bannerImage: true, body: true, publishedAt: true },
    }),
  ])

  // Pick the requested menu or default to the most recently published.
  const menu = menuParam
    ? (publishedMenus.find((m) => m.id === menuParam) ?? publishedMenus[0] ?? null)
    : (publishedMenus[0] ?? null)
  const hasMultipleMenus = publishedMenus.length > 1

  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("dining")) notFound()
  if (!venue || !venue.weeklyMenuEnabled) notFound()

  const currentTopic = venue.topicsEnabled ? topic : null
  const timezone = venue.location?.timezone ?? "UTC"

  // Today's weekday in venue's local timezone (for column highlight and auto-collapse)
  const TZ_DAY_IDX: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  }
  const tzWeekdayAbbr = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, weekday: "short"
  }).format(new Date())
  const todayJsDay = TZ_DAY_IDX[tzWeekdayAbbr] ?? 0

  const layout = settings.diningLayout ?? "content"
  const showLeft  = layout === "sidebar-left"  || layout === "sidebar-both"
  const showRight = layout === "sidebar-right" || layout === "sidebar-both"

  const rightBlocks = settings.sidebarOrder?.split(",").filter(Boolean) ?? ["quickLinks", "browseByTopic", "upcomingEvents"]
  const leftBlocks  = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []

  const closedSlots = new Set(
    menu?.closedDays ? menu.closedDays.split(",").filter(Boolean) : []
  )
  function isSlotClosed(day: string, slotId: string) {
    return closedSlots.has(day) || closedSlots.has(`${day}:${slotId}`)
  }

  const entryMap = new Map<string, NonNullable<typeof menu>["entries"][number]>()
  if (menu) {
    for (const e of menu.entries) {
      entryMap.set(`${e.day}:${e.mealSlotId}:${e.categoryId}`, e)
    }
  }

  const todayDayKey = WEEKDAY_TO_DAY[todayJsDay]
  const isWeekday = todayDayKey !== null

  // Tag lookup and nutrition params for rendering
  const tagMap = new Map(venue.venueTags.map((t) => [t.id, t]))
  const featuredParam = venue.nutritionParams.find((p) => p.featured)
  const nonFeaturedParams = venue.nutritionParams.filter((p) => !p.featured)

  type Entry = NonNullable<typeof menu>["entries"][number]

  /** Resolves an entry's own values with the linked dish as fallback. */
  function resolveEntry(entry: Entry) {
    const nutrition = ((entry.nutrition ?? entry.dish?.nutrition) ?? null) as Record<string, number> | null
    const featuredVal = featuredParam && nutrition ? nutrition[featuredParam.id] : null
    return {
      photo: entry.photo ?? entry.dish?.photo ?? null,
      tagIds: (entry.tagIds || entry.dish?.tagIds || "").split(",").filter(Boolean),
      featuredVal,
      featured: featuredVal != null ? `${featuredVal} ${featuredParam!.unit}` : null,
      macroLine: nonFeaturedParams
        .map((p) => (nutrition?.[p.id] != null ? `${p.name.charAt(0)} ${nutrition[p.id]}${p.unit}` : null))
        .filter(Boolean)
        .join(" · "),
    }
  }

  /** Flattens one meal slot into per-day rows for the day switcher. */
  function buildMobileDays(slotId: string, slotCats: Array<{ id: string; name: string }>): MobileDay[] {
    return DAYS.map((d) => ({
      key: d,
      label: d.charAt(0) + d.slice(1).toLowerCase(),
      closed: isSlotClosed(d, slotId),
      isToday: d === todayDayKey,
      rows: slotCats.map((cat) => {
        const e = entryMap.get(`${d}:${slotId}:${cat.id}`)
        if (!e) return { catId: cat.id, catName: cat.name, entry: null }
        const r = resolveEntry(e)
        return {
          catId: cat.id,
          catName: cat.name,
          entry: {
            name: e.name, description: e.description, photo: r.photo,
            featured: r.featured, macros: r.macroLine || null, note: e.note,
            tags: r.tagIds
              .map((tid) => tagMap.get(tid))
              .filter((t): t is NonNullable<typeof t> => !!t)
              .map((t) => ({ id: t.id, name: t.name, color: t.color, bgColor: t.bgColor })),
          },
        }
      }),
    }))
  }

  const content = (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{venue.name}</h1>
        {menu?.name && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{menu.name}</p>
        )}
      </div>

      {/* Menu selector — shown only when multiple menus are published */}
      {hasMultipleMenus && (
        <div className="flex flex-wrap gap-2">
          {publishedMenus.map((m) => (
            <a
              key={m.id}
              href={`/dining/${id}?menu=${m.id}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                m.id === menu?.id
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              }`}
            >
              {m.name ?? "Menu"}
            </a>
          ))}
        </div>
      )}

      {/* Topic hero banner */}
      {currentTopic && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {currentTopic.bannerImage && (
            <div className="relative h-48 overflow-hidden">
              <img
                src={`${currentTopic.bannerImage}?w=800`}
                alt={currentTopic.title}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          )}
          <div className="h-1.5 w-full bg-brand" />
          <div className="px-4 pb-4 pt-3">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{currentTopic.title}</p>
            {currentTopic.body && (
              <p className="mt-0.5 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{currentTopic.body}</p>
            )}
            {venue.topicsEnabled && (
              <a href={`/dining/${id}/announcements`} className="mt-2 inline-block text-xs font-medium text-brand hover:underline">
                Learn more →
              </a>
            )}
          </div>
        </div>
      )}

      {!menu ? (
        <div className="overflow-hidden rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400">No menu available yet.</p>
        </div>
      ) : menu.menuType === "FIXED" ? (
        <FixedMenuView
          sections={menu.fixedSections.map((s) => ({
            id: s.id,
            name: s.name,
            entries: s.entries.map((e) => ({
              id: e.id,
              name: e.name,
              description: e.description,
              photo: e.photo,
              price: e.price != null ? Number(e.price) : null,
              tagIds: e.tagIds,
              note: e.note,
              soldOut: e.soldOut,
              nutrition: (e.nutrition ?? null) as Record<string, number> | null,
              modifierGroups: e.modifierGroups.map((g) => ({
                id: g.id,
                name: g.name,
                required: g.required,
                multiSelect: g.multiSelect,
                options: g.options.map((o) => ({
                  id: o.id,
                  label: o.label,
                  priceDelta: Number(o.priceDelta),
                  isDefault: o.isDefault,
                  color: o.color,
                })),
              })),
            })),
          }))}
          tags={venue.venueTags}
          nutritionParams={venue.nutritionParams}
          currency={settings.diningCurrency}
        />
      ) : (
        <div className="space-y-8">
          {venue.mealSlots.map((slot) => {
            const slotCats = venue.categories.filter((c) => c.mealSlotId === slot.id)
            if (slotCats.length === 0) return null

            const hours = slot.timeStart && slot.timeEnd
              ? `${slot.timeStart}-${slot.timeEnd}`
              : null

            return (
              <CollapsibleMealSlot
                key={slot.id}
                name={slot.name}
                hours={hours}
                timezone={timezone}
                isWeekday={isWeekday}
                badge={isWeekday
                  ? <MealStatusBadge hours={hours} timezone={timezone} initial={getMealStatus(hours, timezone)} />
                  : null}
              >
                <MobileWeekMenu days={buildMobileDays(slot.id, slotCats)} />
              </CollapsibleMealSlot>
            )
          })}
        </div>
      )}
    </div>
  )

  if (!showLeft && !showRight) return (
    <CartProvider>
      <div className="mx-auto max-w-5xl">
        {content}
        <CartWidget currency={settings.diningCurrency} />
      </div>
    </CartProvider>
  )

  return (
    <CartProvider>
      <div className="flex items-start gap-8">
        {showLeft && (
          <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />}>
              <DiningSidebar
                blocks={leftBlocks}
                eventsEnabled={enabled.has("events")}
                kudosEnabled={enabled.has("kudos")}
                gravatarsEnabled={settings.gravatarsEnabled}
              />
            </Suspense>
          </aside>
        )}
        <main className="min-w-0 flex-1">{content}</main>
        {showRight && (
          <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />}>
              <DiningSidebar
                blocks={rightBlocks}
                eventsEnabled={enabled.has("events")}
                kudosEnabled={enabled.has("kudos")}
                gravatarsEnabled={settings.gravatarsEnabled}
              />
            </Suspense>
          </aside>
        )}
        <CartWidget currency={settings.diningCurrency} />
      </div>
    </CartProvider>
  )
}

/**
 * Sidebar data is fetched here rather than in the page so its three queries sit
 * behind a Suspense boundary. Previously they ran after the menu queries had
 * resolved and gated the whole grid on a second round trip; now the grid streams
 * first and the sidebar fills in.
 */
async function DiningSidebar({
  blocks,
  eventsEnabled,
  kudosEnabled,
  gravatarsEnabled,
}: {
  blocks: string[]
  eventsEnabled: boolean
  kudosEnabled: boolean
  gravatarsEnabled: boolean
}) {
  const [quickLinks, upcomingEvents, categories] = await Promise.all([
    getQuickLinks(),
    getUpcomingEvents(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ])

  return (
    <SidebarBlocks
      blocks={blocks}
      eventsEnabled={eventsEnabled}
      kudosEnabled={kudosEnabled}
      quickLinks={quickLinks}
      categories={categories}
      upcomingEvents={upcomingEvents}
      gravatarsEnabled={gravatarsEnabled}
    />
  )
}
