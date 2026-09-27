import Link from "next/link"
import { notFound } from "next/navigation"
import { Utensils, CalendarDays, Newspaper, Settings, Pencil } from "lucide-react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { locationFilter } from "@/lib/dining-scope"
import { PageHeader } from "@/components/ui/page-header"
import { AdminFilters } from "@/components/admin-filters"
import { AdminTable, type AdminTableCol } from "@/components/ui/admin-table"
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

  type MenuRow = NonNullable<typeof menus>[number]
  const menuColumns: AdminTableCol<MenuRow>[] = [
    {
      id: "name",
      header: "Name",
      render: (m) => (
        <Link href={`/admin/dining/venues/${id}/menus/${m.id}`} className="font-medium text-foreground hover:text-brand hover:underline">
          {m.name ?? <span className="text-muted-foreground">—</span>}
        </Link>
      ),
    },
    {
      id: "type",
      header: "Type",
      width: "w-20",
      render: (m) => (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.menuType === "FIXED" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
          {m.menuType === "FIXED" ? "Fixed" : "Weekly"}
        </span>
      ),
    },
    {
      id: "items",
      header: "Items",
      type: "number",
      width: "w-16",
      render: (m) => (m.menuType === "FIXED" ? m.fixedSections.reduce((s, sec) => s + sec._count.entries, 0) : m._count.entries),
    },
    {
      id: "status",
      header: "Status",
      type: "center",
      width: "w-28",
      render: (m) => <MenuPublishToggle menuId={m.id} published={!!m.publishedAt} />,
    },
    {
      id: "actions",
      header: "",
      type: "actions",
      width: "w-16",
      render: (m) => (
        <>
          <Link
            href={`/admin/dining/venues/${id}/menus/${m.id}`}
            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Edit"
          >
            <Pencil className="size-3.5" />
          </Link>
          <MenuDeleteButton menuId={m.id} />
        </>
      ),
    },
  ]

  const topics = tab === "announcements"
    ? await db.monthlyTopic.findMany({
        where: { venueId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, venueId: true, title: true, bannerImage: true, body: true, publishedAt: true },
      })
    : null

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={venue.name}
        description={venue.location.name}
        back={{ href: "/admin/dining", label: "Dining" }}
      />

      <nav className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const active = t.id === tab
          return (
            <Link
              key={t.id}
              href={`?tab=${t.id}`}
              className={`relative flex items-center gap-1.5 px-4 pb-3 text-sm font-medium transition-colors
                ${active
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-t-full after:bg-brand"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <t.icon className="size-3.5" aria-hidden />
              {t.label}
            </Link>
          )
        })}
      </nav>

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
          <div className="flex justify-end">
            <WeekPickerCreate venueId={id} />
          </div>

          <AdminFilters basePath={`/admin/dining/venues/${id}`} query={q} showStatus={false} placeholder="Search menus…" />

          {menus.length === 0 ? (
            <p className="text-sm text-muted-foreground">{q ? "No menus match your search." : "No menus yet."}</p>
          ) : (
            <AdminTable columns={menuColumns} rows={menus} rowKey={(m) => m.id} rowAlign="middle" />
          )}
        </div>
      )}

      {tab === "announcements" && topics !== null && (
        <TopicsList venueId={id} topics={topics} />
      )}
    </div>
  )
}
