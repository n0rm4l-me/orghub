import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Utensils, CalendarDays, Newspaper, Settings, Pencil, Search } from "lucide-react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { locationFilter } from "@/lib/dining-scope"
import { PageHeader } from "@/components/ui/page-header"
import { VenueSettingsForm } from "@/components/dining/venue-settings-form"
import { MealStructureEditor } from "@/components/dining/meal-structure-editor"
import { VenueTagsEditor } from "@/components/dining/venue-tags-editor"
import { NutritionParamsEditor } from "@/components/dining/nutrition-params-editor"
import { DishList } from "@/components/dining/dish-list"
import { TopicsList } from "@/components/dining/topics-list"
import { WeekPickerCreate } from "@/components/dining/week-picker-create"
import { MenuDeleteButton } from "@/components/dining/menu-delete-button"
import { MenuPublishToggle } from "@/components/dining/menu-publish-toggle"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const venue = await db.venue.findUnique({ where: { id }, select: { name: true } })
  return { title: venue ? `${venue.name} – Dining` : "Venue" }
}

const PER_PAGE = 30

export default async function VenuePage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams
  const tab = sp.tab ?? "settings"

  const user = await requireRole("EDITOR")

  const [settings, venue] = await Promise.all([
    getSettings(),
    db.venue.findFirst({
      where: { id, ...(await locationFilter(user.id, user.role)) },
      include: {
        location: true,
        categories: { orderBy: { order: "asc" } },
        mealSlots: { orderBy: { order: "asc" } },
        venueTags: { orderBy: { order: "asc" } },
        nutritionParams: { orderBy: { order: "asc" } },
      },
    }),
  ])
  if (!venue) notFound()

  const tabs = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "dishes", label: "Dishes", icon: Utensils },
    { id: "menus", label: "Menus", icon: CalendarDays },
    { id: "announcements", label: "Announcements", icon: Newspaper },
  ]

  const q = sp.q?.trim() || undefined
  const page = Math.max(1, Number(sp.page) || 1)

  const dishData = tab === "dishes"
    ? await (async () => {
        const where = q
          ? { venueId: id, name: { contains: q, mode: "insensitive" as const } }
          : { venueId: id }
        const [dishes, total] = await Promise.all([
          db.dish.findMany({
            where, orderBy: { name: "asc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE,
            include: {
              modifierGroups: {
                orderBy: { order: "asc" },
                include: { options: { orderBy: { order: "asc" } } },
              },
            },
          }),
          db.dish.count({ where }),
        ])
        return { dishes, total }
      })()
    : null

  const menus = tab === "menus"
    ? await db.weekMenu.findMany({
        where: {
          venueId: id,
          ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { entries: true } },
          fixedSections: { select: { _count: { select: { entries: true } } } },
        },
      })
    : null

  const topics = tab === "announcements"
    ? await db.monthlyTopic.findMany({
        where: { venueId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, venueId: true, title: true, bannerImage: true, body: true, publishedAt: true },
      })
    : null

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/dining" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="size-4" aria-hidden />
          Dining
        </Link>
      </div>

      <PageHeader title={venue.name} description={venue.location.name} />

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => {
          const active = t.id === tab
          return (
            <Link
              key={t.id}
              href={`?tab=${t.id}`}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition -mb-px
                ${active ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-800"}`}
            >
              <t.icon className="size-3.5" aria-hidden />
              {t.label}
            </Link>
          )
        })}
      </div>

      {tab === "settings" && (
        <div className="space-y-6">
          {/* updateVenue is ADMIN-only. Showing this to an editor produced a form
              that redirected to /no-access on submit and discarded their input. */}
          {user.role === "ADMIN" && <VenueSettingsForm venue={venue} />}
          <MealStructureEditor
            venueId={id}
            initialSlots={venue.mealSlots}
            initialCategories={venue.categories}
          />
          <NutritionParamsEditor venueId={id} initialParams={venue.nutritionParams} />
          <VenueTagsEditor venueId={id} initialTags={venue.venueTags} />
        </div>
      )}

      {tab === "dishes" && dishData && (
        <DishList
          venueId={id}
          dishes={dishData.dishes.map((d) => ({
            ...d,
            price: d.price != null ? Number(d.price) : null,
            modifierGroups: d.modifierGroups.map((g) => ({
              ...g,
              options: g.options.map((o) => ({ ...o, priceDelta: Number(o.priceDelta) })),
            })),
          }))}
          total={dishData.total}
          page={Math.max(1, Number(sp.page) || 1)}
          perPage={PER_PAGE}
          q={sp.q?.trim()}
          nutritionParams={venue.nutritionParams}
          venueTags={venue.venueTags}
          currency={settings.diningCurrency}
        />
      )}

      {tab === "menus" && menus !== null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <form method="GET" className="relative flex-1 max-w-xs">
              <input type="hidden" name="tab" value="menus" />
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search menus…"
                className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </form>
            <WeekPickerCreate venueId={id} />
          </div>

          {menus.length === 0 ? (
            <p className="text-sm text-gray-400">{q ? "No menus match your search." : "No menus yet."}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500">
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="w-20 px-3 py-3 text-left">Type</th>
                    <th className="w-16 px-3 py-3 text-center">Items</th>
                    <th className="w-28 px-3 py-3 text-center">Status</th>
                    <th className="w-16 px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {menus.map((m) => {
                    const isFixed = m.menuType === "FIXED"
                    const count = isFixed
                      ? m.fixedSections.reduce((s, sec) => s + sec._count.entries, 0)
                      : m._count.entries
                    return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        <Link href={`/admin/dining/venues/${id}/menus/${m.id}`} className="hover:text-brand hover:underline">
                          {m.name ?? <span className="text-gray-400">—</span>}
                        </Link>
                      </td>
                      <td className="w-20 px-3 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${isFixed ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
                          {isFixed ? "Fixed" : "Weekly"}
                        </span>
                      </td>
                      <td className="w-16 px-3 py-3 text-center text-gray-600">{count}</td>
                      <td className="w-28 px-3 py-3 text-center">
                        <MenuPublishToggle menuId={m.id} published={!!m.publishedAt} />
                      </td>
                      <td className="w-16 px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/dining/venues/${id}/menus/${m.id}`}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                          <MenuDeleteButton menuId={m.id} />
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "announcements" && topics !== null && (
        <TopicsList venueId={id} topics={topics} />
      )}
    </div>
  )
}
