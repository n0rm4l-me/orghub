import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { WeekMenuGrid } from "@/components/dining/week-menu-grid"
import { FixedMenuEditor } from "@/components/dining/fixed-menu-editor"
import type { DayOfWeek } from "@prisma/client"

interface Props {
  params: Promise<{ id: string; weekStart: string }>
}

export async function generateMetadata({ params }: Props) {
  const { weekStart: menuId } = await params
  const menu = await db.weekMenu.findUnique({ where: { id: menuId }, select: { name: true } })
  return { title: menu?.name ? `${menu.name} — Menu` : "Menu editor" }
}

export default async function WeekMenuEditorPage({ params }: Props) {
  const { id, weekStart: menuId } = await params
  await requireRole("EDITOR")

  const [settings, menu] = await Promise.all([
    getSettings(),
    db.weekMenu.findUnique({
    where: { id: menuId },
    include: {
      venue: {
        include: {
          categories: { orderBy: { order: "asc" } },
          mealSlots: { orderBy: { order: "asc" } },
          venueTags: { orderBy: { order: "asc" } },
          nutritionParams: { orderBy: { order: "asc" } },
        },
      },
      entries: { include: { dish: { select: { name: true, description: true, photo: true } } } },
      fixedSections: {
        orderBy: { order: "asc" },
        include: {
          entries: {
            orderBy: { order: "asc" },
            include: {
              dish: { select: { name: true, description: true, photo: true, price: true } },
              modifierGroups: {
                orderBy: { order: "asc" },
                include: { options: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      },
    },
  })])
  if (!menu || menu.venueId !== id) notFound()

  const venue = menu.venue
  const isFixed = menu.menuType === "FIXED"

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link href={`/admin/dining/venues/${id}?tab=menus`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="size-4" aria-hidden />
          Menus
        </Link>
      </div>

      {isFixed ? (
        <FixedMenuEditor
          menuId={menuId}
          venueId={id}
          menuName={menu.name ?? null}
          publishedAt={menu.publishedAt?.toISOString() ?? null}
          venueTags={venue.venueTags}
          nutritionParams={venue.nutritionParams}
          currency={settings.diningCurrency}
          initialSections={menu.fixedSections.map((s) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            entries: s.entries.map((e) => ({
              id: e.id,
              dishId: e.dishId,
              name: e.name,
              description: e.description,
              photo: e.photo ?? e.dish?.photo ?? null,
              price: e.price != null ? Number(e.price) : null,
              nutrition: (e.nutrition ?? null) as Record<string, number> | null,
              tagIds: e.tagIds,
              note: e.note,
              soldOut: e.soldOut,
              order: e.order,
              modifierGroups: e.modifierGroups.map((g) => ({
                id: g.id,
                name: g.name,
                required: g.required,
                multiSelect: g.multiSelect,
                order: g.order,
                options: g.options.map((o) => ({
                  id: o.id,
                  label: o.label,
                  priceDelta: Number(o.priceDelta),
                  isDefault: o.isDefault,
                  color: o.color,
                  order: o.order,
                })),
              })),
            })),
          }))}
        />
      ) : (
        <WeekMenuGrid
          menuId={menuId}
          venueId={id}
          menuName={menu.name ?? null}
          mealSlots={venue.mealSlots}
          categories={venue.categories}
          nutritionParams={venue.nutritionParams}
          venueTags={venue.venueTags}
          initialEntries={menu.entries}
          publishedAt={menu.publishedAt?.toISOString() ?? null}
          initialClosedDays={menu.closedDays ? menu.closedDays.split(",").filter(Boolean) : []}
        />
      )}
    </div>
  )
}
