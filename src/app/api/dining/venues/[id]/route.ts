import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { parseModules } from "@/lib/modules"
import { getSettings } from "@/lib/settings"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const settings = await getSettings()
  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("dining")) {
    return NextResponse.json({ error: "Module disabled" }, { status: 404 })
  }

  const [venue, menus, topic] = await Promise.all([
    db.venue.findUnique({
      where: { id },
      include: {
        location: { select: { timezone: true } },
        mealSlots: {
          orderBy: { order: "asc" },
          include: { categories: { orderBy: { order: "asc" } } },
        },
        venueTags: { orderBy: { order: "asc" } },
        nutritionParams: { orderBy: { order: "asc" } },
      },
    }),
    db.weekMenu.findMany({
      where: { venueId: id, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 1,
      include: {
        entries: {
          include: { dish: true },
          orderBy: [{ day: "asc" }],
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
      select: { id: true, title: true, bannerImage: true },
    }),
  ])

  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const menu = menus[0] ?? null

  const resolvedEntries =
    menu?.entries.map((e) => ({
      id: e.id,
      day: e.day,
      mealSlotId: e.mealSlotId,
      categoryId: e.categoryId,
      name: e.name ?? e.dish?.name ?? "",
      description: e.description ?? e.dish?.description ?? null,
      photo: e.photo ?? e.dish?.photo ?? null,
      nutrition: (e.nutrition ?? e.dish?.nutrition ?? null) as Record<string, number> | null,
      tagIds: e.tagIds || e.dish?.tagIds || "",
      note: e.note ?? null,
    })) ?? []

  return NextResponse.json({
    venue: {
      id: venue.id,
      name: venue.name,
      venueType: venue.venueType,
      timezone: venue.location.timezone,
      mealSlots: venue.mealSlots.map((s) => ({
        id: s.id,
        name: s.name,
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
        order: s.order,
        categories: s.categories.map((c) => ({ id: c.id, name: c.name })),
      })),
      venueTags: venue.venueTags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        bgColor: t.bgColor,
      })),
      nutritionParams: venue.nutritionParams.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        featured: p.featured,
      })),
    },
    menu: menu
      ? {
          id: menu.id,
          name: menu.name,
          menuType: menu.menuType,
          weekStart: menu.weekStart,
          closedDays: menu.closedDays,
          entries: resolvedEntries,
          fixedSections: menu.fixedSections.map((s) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            entries: s.entries.map((e) => ({
              id: e.id,
              name: e.name,
              description: e.description,
              photo: e.photo,
              price: e.price != null ? String(e.price) : null,
              nutrition: (e.nutrition ?? null) as Record<string, number> | null,
              tagIds: e.tagIds,
              note: e.note,
              soldOut: e.soldOut,
              modifierGroups: e.modifierGroups.map((g) => ({
                id: g.id,
                name: g.name,
                required: g.required,
                multiSelect: g.multiSelect,
                options: g.options.map((o) => ({
                  id: o.id,
                  label: o.label,
                  priceDelta: String(o.priceDelta),
                  isDefault: o.isDefault,
                  color: o.color,
                })),
              })),
            })),
          })),
        }
      : null,
    topic: topic ? { id: topic.id, title: topic.title, bannerImage: topic.bannerImage } : null,
    currency: (settings as { diningCurrency?: string }).diningCurrency ?? "¥",
  })
}
