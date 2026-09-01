"use server"

import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/rbac"
import { locationFilter } from "@/lib/dining-scope"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"
import type { DayOfWeek, Role } from "@prisma/client"

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Loads a venue the caller may edit, or null. Editors are scoped to their location. */
async function findEditableVenue(userId: string, role: Role, venueId: string) {
  return db.venue.findFirst({
    where: { id: venueId, ...(await locationFilter(userId, role)) },
    include: { location: { select: { timezone: true } } },
  })
}

/**
 * True when the caller may edit resources under `locationId`. Mirrors
 * locationFilter: an editor with no location assigned may edit nothing.
 */
async function canEditLocation(userId: string, role: Role, locationId: string) {
  if (role === "ADMIN") return true
  const u = await db.user.findUnique({ where: { id: userId }, select: { locationId: true } })
  return u?.locationId != null && u.locationId === locationId
}

// ── Locations (ADMIN only) ─────────────────────────────────────────────────────

export async function createLocation(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const name = (formData.get("name") as string).trim()
  const timezone = ((formData.get("timezone") as string) ?? "America/New_York").trim()
  if (!name) return fail("Name is required.", "name")
  await db.location.create({ data: { name, timezone } })
  revalidatePath("/admin/dining")
  return ok("Location created.")
}

export async function updateLocation(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const name = (formData.get("name") as string).trim()
  const timezone = ((formData.get("timezone") as string) ?? "America/New_York").trim()
  if (!name) return fail("Name is required.", "name")
  await db.location.update({ where: { id }, data: { name, timezone } })
  revalidatePath("/admin/dining")
  // Location.timezone drives the portal's "today" highlight and slot status.
  revalidatePath("/dining", "layout")
  return ok("Location updated.")
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await db.location.delete({ where: { id } })
  revalidatePath("/admin/dining")
  revalidatePath("/dining", "layout")
  return ok("Location deleted.")
}

// ── Venues (ADMIN only) ────────────────────────────────────────────────────────

export async function createVenue(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const name = (formData.get("name") as string).trim()
  const locationId = (formData.get("locationId") as string).trim()
  const weeklyMenuEnabled = formData.get("weeklyMenuEnabled") === "true"
  const topicsEnabled = formData.get("topicsEnabled") === "true"
  if (!name) return fail("Name is required.", "name")
  if (!locationId) return fail("Location is required.", "locationId")
  const venueType = ((formData.get("venueType") as string) ?? "CAFETERIA").trim()
  await db.venue.create({ data: { name, locationId, weeklyMenuEnabled, topicsEnabled, venueType } })
  revalidatePath("/admin/dining")
  revalidatePath("/dining", "layout")
  return ok("Venue created.")
}

export async function updateVenue(id: string, formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN")
  const name = (formData.get("name") as string).trim()
  const venueType = ((formData.get("venueType") as string) ?? "CAFETERIA").trim()
  if (!name) return fail("Name is required.", "name")
  await db.venue.update({ where: { id }, data: { name, venueType } })
  revalidatePath("/admin/dining")
  revalidatePath(`/admin/dining/venues/${id}`)
  revalidatePath(`/dining/${id}`)
  revalidatePath("/dining", "layout")
  return ok("Venue updated.")
}

export async function deleteVenue(id: string): Promise<ActionResult> {
  await requireRole("ADMIN")
  await db.venue.delete({ where: { id } })
  revalidatePath("/admin/dining")
  revalidatePath(`/dining/${id}`)
  revalidatePath("/dining", "layout")
  return ok("Venue deleted.")
}

// ── Meal Slots ─────────────────────────────────────────────────────────────────

type MealSlotInput = { id?: string; name: string; timeStart?: string | null; timeEnd?: string | null; order: number }

export async function upsertMealSlots(venueId: string, slots: MealSlotInput[]): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")

  await db.$transaction(async (tx) => {
    const incomingIds = slots.filter((s) => s.id).map((s) => s.id as string)
    await tx.mealSlot.deleteMany({ where: { venueId, id: { notIn: incomingIds } } })
    for (const s of slots) {
      const data = {
        name: s.name,
        timeStart: s.timeStart?.trim() || null,
        timeEnd: s.timeEnd?.trim() || null,
        order: s.order,
      }
      if (s.id) {
        // updateMany, not update: scoping by venueId stops a client-supplied
        // id from reaching another venue's row.
        await tx.mealSlot.updateMany({ where: { id: s.id, venueId }, data })
      } else {
        await tx.mealSlot.create({ data: { venueId, ...data } })
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${venueId}`)
  revalidatePath(`/dining/${venueId}`)
  return ok("Meal slots saved.")
}

// ── Venue Tags ─────────────────────────────────────────────────────────────────

type VenueTagInput = { id?: string; name: string; color: string; bgColor: string; order: number }

export async function upsertVenueTags(venueId: string, tags: VenueTagInput[]): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")

  await db.$transaction(async (tx) => {
    const incomingIds = tags.filter((t) => t.id).map((t) => t.id as string)
    await tx.venueTag.deleteMany({ where: { venueId, id: { notIn: incomingIds } } })
    for (const t of tags) {
      const data = { name: t.name, color: t.color, bgColor: t.bgColor, order: t.order }
      if (t.id) {
        await tx.venueTag.updateMany({ where: { id: t.id, venueId }, data })
      } else {
        await tx.venueTag.create({ data: { venueId, ...data } })
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${venueId}`)
  revalidatePath(`/dining/${venueId}`)
  return ok("Tags saved.")
}

// ── Nutrition Params ───────────────────────────────────────────────────────────

type NutritionParamInput = { id?: string; name: string; unit: string; featured: boolean; order: number }

export async function upsertNutritionParams(venueId: string, params: NutritionParamInput[]): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")

  await db.$transaction(async (tx) => {
    const incomingIds = params.filter((p) => p.id).map((p) => p.id as string)
    await tx.nutritionParam.deleteMany({ where: { venueId, id: { notIn: incomingIds } } })
    for (const p of params) {
      const data = { name: p.name, unit: p.unit, featured: p.featured, order: p.order }
      if (p.id) {
        await tx.nutritionParam.updateMany({ where: { id: p.id, venueId }, data })
      } else {
        await tx.nutritionParam.create({ data: { venueId, ...data } })
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${venueId}`)
  revalidatePath(`/dining/${venueId}`)
  return ok("Nutrition params saved.")
}

// ── Categories ─────────────────────────────────────────────────────────────────

type CategoryInput = { id?: string; name: string; mealSlotId: string; order: number }

export async function upsertCategories(
  venueId: string,
  categories: CategoryInput[],
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")

  // A category pointed at another venue's slot would render nowhere while its
  // entries stayed behind, so reject unknown slot ids outright.
  const ownSlotIds = new Set(
    (await db.mealSlot.findMany({ where: { venueId }, select: { id: true } })).map((s) => s.id),
  )
  if (categories.some((c) => !ownSlotIds.has(c.mealSlotId))) {
    return fail("Unknown meal slot.")
  }

  await db.$transaction(async (tx) => {
    const incomingIds = categories.filter((c) => c.id).map((c) => c.id as string)
    await tx.mealCategory.deleteMany({
      where: { venueId, id: { notIn: incomingIds } },
    })
    for (const cat of categories) {
      if (cat.id) {
        await tx.mealCategory.updateMany({
          where: { id: cat.id, venueId },
          data: { name: cat.name, mealSlotId: cat.mealSlotId, order: cat.order },
        })
      } else {
        await tx.mealCategory.create({
          data: { venueId, name: cat.name, mealSlotId: cat.mealSlotId, order: cat.order },
        })
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${venueId}`)
  revalidatePath(`/dining/${venueId}`)
  return ok("Categories saved.")
}

type SlotWithCats = {
  id?: string
  name: string
  timeStart?: string | null
  timeEnd?: string | null
  order: number
  categories: Array<{ id?: string; name: string }>
}

export async function upsertSlotsAndCategories(venueId: string, slots: SlotWithCats[]): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")

  // Row ids arrive from the client. Anything not already owned by this venue is
  // rejected rather than silently written into slotIdMap below.
  const ownSlotIds = new Set(
    (await db.mealSlot.findMany({ where: { venueId }, select: { id: true } })).map((s) => s.id),
  )
  if (slots.some((s) => s.id && !ownSlotIds.has(s.id))) return fail("Unknown meal slot.")

  await db.$transaction(async (tx) => {
    const incomingSlotIds = slots.filter((s) => s.id).map((s) => s.id as string)
    await tx.mealSlot.deleteMany({ where: { venueId, id: { notIn: incomingSlotIds } } })

    const slotIdMap = new Map<number, string>()
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      const data = {
        name: s.name,
        timeStart: s.timeStart?.trim() || null,
        timeEnd: s.timeEnd?.trim() || null,
        order: s.order,
      }
      if (s.id) {
        await tx.mealSlot.updateMany({ where: { id: s.id, venueId }, data })
        slotIdMap.set(i, s.id)
      } else {
        const created = await tx.mealSlot.create({ data: { venueId, ...data } })
        slotIdMap.set(i, created.id)
      }
    }

    const allCats = slots.flatMap((s, si) =>
      s.categories.map((c, ci) => ({ ...c, mealSlotId: slotIdMap.get(si)!, order: ci }))
    )
    const incomingCatIds = allCats.filter((c) => c.id).map((c) => c.id as string)
    await tx.mealCategory.deleteMany({ where: { venueId, id: { notIn: incomingCatIds } } })

    for (let i = 0; i < allCats.length; i++) {
      const c = allCats[i]
      if (c.id) {
        await tx.mealCategory.updateMany({ where: { id: c.id, venueId }, data: { name: c.name, mealSlotId: c.mealSlotId, order: i } })
      } else {
        await tx.mealCategory.create({ data: { venueId, name: c.name, mealSlotId: c.mealSlotId, order: i } })
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${venueId}`)
  revalidatePath(`/dining/${venueId}`)
  return ok("Saved.")
}

// ── Dishes ─────────────────────────────────────────────────────────────────────

export async function createDish(venueId: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")

  const name = (formData.get("name") as string).trim()
  if (!name) return fail("Name is required.", "name")

  const nutritionRaw = formData.get("nutrition") as string | null
  const nutrition = nutritionRaw ? JSON.parse(nutritionRaw) : null
  const priceRaw = (formData.get("price") as string ?? "").trim()
  const price = priceRaw ? Number(priceRaw) : null

  const dish = await db.dish.create({
    data: {
      venueId,
      name,
      description: ((formData.get("description") as string) ?? "").trim() || null,
      photo: ((formData.get("photo") as string) ?? "").trim() || null,
      price: price != null && !isNaN(price) ? price : null,
      nutrition,
      tagIds: ((formData.get("tagIds") as string) ?? "").trim(),
    },
  })

  revalidatePath(`/admin/dining/venues/${venueId}`)
  return okWith({ id: dish.id })
}

export async function updateDish(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const dish = await db.dish.findUnique({ where: { id }, include: { venue: true } })
  if (!dish) return fail("Dish not found.")
  if (!(await canEditLocation(user.id, user.role, dish.venue.locationId))) return fail("Not authorized.")

  const name = (formData.get("name") as string).trim()
  if (!name) return fail("Name is required.", "name")

  const nutritionRaw = formData.get("nutrition") as string | null
  const nutrition = nutritionRaw ? JSON.parse(nutritionRaw) : null
  const priceRaw = (formData.get("price") as string ?? "").trim()
  const price = priceRaw ? Number(priceRaw) : null

  await db.dish.update({
    where: { id },
    data: {
      name,
      description: ((formData.get("description") as string) ?? "").trim() || null,
      photo: ((formData.get("photo") as string) ?? "").trim() || null,
      price: price != null && !isNaN(price) ? price : null,
      nutrition,
      tagIds: ((formData.get("tagIds") as string) ?? "").trim(),
    },
  })

  revalidatePath(`/admin/dining/venues/${dish.venueId}`)
  revalidatePath(`/dining/${dish.venueId}`)
  return ok("Dish updated.")
}

type DishModifierGroupInput = {
  id?: string
  name: string
  required: boolean
  multiSelect: boolean
  order: number
  options: Array<{ id?: string; label: string; priceDelta: number; isDefault: boolean; order: number }>
}

export async function saveDishModifiers(
  dishId: string,
  groups: DishModifierGroupInput[],
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const dish = await db.dish.findUnique({ where: { id: dishId }, include: { venue: true } })
  if (!dish) return fail("Dish not found.")
  if (!(await canEditLocation(user.id, user.role, dish.venue.locationId))) return fail("Not authorized.")

  await db.$transaction(async (tx) => {
    const incomingGroupIds = groups.filter((g) => g.id).map((g) => g.id as string)
    await tx.dishModifierGroup.deleteMany({ where: { dishId, id: { notIn: incomingGroupIds } } })

    for (const g of groups) {
      let groupId: string
      const groupData = { name: g.name, required: g.required, multiSelect: g.multiSelect, order: g.order }
      if (g.id) {
        await tx.dishModifierGroup.updateMany({ where: { id: g.id, dishId }, data: groupData })
        groupId = g.id
      } else {
        const created = await tx.dishModifierGroup.create({ data: { dishId, ...groupData } })
        groupId = created.id
      }

      const incomingOptIds = g.options.filter((o) => o.id).map((o) => o.id as string)
      await tx.dishModifierOption.deleteMany({ where: { groupId, id: { notIn: incomingOptIds } } })

      for (const o of g.options) {
        const optData = { label: o.label, priceDelta: o.priceDelta, isDefault: o.isDefault, order: o.order }
        if (o.id) {
          await tx.dishModifierOption.updateMany({ where: { id: o.id, groupId }, data: optData })
        } else {
          await tx.dishModifierOption.create({ data: { groupId, ...optData } })
        }
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${dish.venueId}`)
  return ok("Modifiers saved.")
}

export async function deleteDish(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const dish = await db.dish.findUnique({ where: { id }, include: { venue: true } })
  if (!dish) return fail("Dish not found.")
  if (!(await canEditLocation(user.id, user.role, dish.venue.locationId))) return fail("Not authorized.")
  await db.dish.delete({ where: { id } })
  revalidatePath(`/admin/dining/venues/${dish.venueId}`)
  // A deleted dish leaves entries with dishId = null, dropping their fallbacks.
  revalidatePath(`/dining/${dish.venueId}`)
  return ok("Dish deleted.")
}

export async function getDishes(venueId: string, q?: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")
  const dishes = await db.dish.findMany({
    where: {
      venueId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      photo: true,
      price: true,
      nutrition: true,
      tagIds: true,
      modifierGroups: {
        orderBy: { order: "asc" },
        select: {
          id: true, name: true, required: true, multiSelect: true, order: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, label: true, priceDelta: true, isDefault: true, order: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  })
  return okWith(dishes)
}

// ── Weekly menus ───────────────────────────────────────────────────────────────

/** Monday of the week containing the given calendar date, at UTC midnight. */
function mondayOf(year: number, month: number, day: number): Date {
  const d = new Date(Date.UTC(year, month - 1, day))
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

/** Today's calendar date in `timezone` — not the server's. */
function todayIn(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { year: get("year"), month: get("month"), day: get("day") }
}

export async function createWeekMenu(
  venueId: string,
  name?: string | null,
  menuType?: string | null,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")

  const menu = await db.weekMenu.create({
    data: { venueId, weekStart: new Date(), name: name?.trim() || null, menuType: menuType || "WEEKLY" },
  })
  revalidatePath(`/admin/dining/venues/${venueId}`)
  return okWith({ id: menu.id })
}

export async function updateWeekMenuName(
  menuId: string,
  name: string | null,
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const menu = await db.weekMenu.findUnique({ where: { id: menuId }, include: { venue: true } })
  if (!menu) return fail("Menu not found.")
  if (!(await canEditLocation(user.id, user.role, menu.venue.locationId))) return fail("Not authorized.")
  await db.weekMenu.update({ where: { id: menuId }, data: { name: name?.trim() || null } })
  revalidatePath(`/admin/dining/venues/${menu.venueId}`)
  revalidatePath(`/admin/dining/venues/${menu.venueId}/menus/${menuId}`)
  revalidatePath(`/dining/${menu.venueId}`)
  return ok("Renamed.")
}

type EntryInput = {
  day: DayOfWeek
  mealSlotId: string
  categoryId: string
  dishId?: string | null
  name?: string | null
  description?: string | null
  photo?: string | null
  nutrition?: Record<string, number | null> | null
  tagIds?: string
  note?: string | null
}

export async function saveWeekMenuEntries(
  weekMenuId: string,
  mealSlotId: string,
  entries: EntryInput[],
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const menu = await db.weekMenu.findUnique({
    where: { id: weekMenuId },
    include: { venue: true },
  })
  if (!menu) return fail("Menu not found.")
  if (!(await canEditLocation(user.id, user.role, menu.venue.locationId))) return fail("Not authorized.")

  await db.$transaction(async (tx) => {
    await tx.weekMenuEntry.deleteMany({ where: { weekMenuId, mealSlotId } })
    if (entries.length > 0) {
      await tx.weekMenuEntry.createMany({
        data: entries.map((e) => ({
          ...e,
          weekMenuId,
          tagIds: e.tagIds ?? "",
          nutrition: (e.nutrition ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      })
    }
  })

  revalidatePath(`/admin/dining/venues/${menu.venueId}/menus/${weekMenuId}`)
  revalidatePath(`/dining/${menu.venue.id}`)
  return ok("Entries saved.")
}

export async function publishWeekMenu(weekMenuId: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const menu = await db.weekMenu.findUnique({ where: { id: weekMenuId }, include: { venue: true } })
  if (!menu) return fail("Menu not found.")
  if (!(await canEditLocation(user.id, user.role, menu.venue.locationId))) return fail("Not authorized.")
  await db.$transaction(async (tx) => {
    await tx.weekMenu.updateMany({ where: { venueId: menu.venueId, id: { not: weekMenuId } }, data: { publishedAt: null } })
    await tx.weekMenu.update({ where: { id: weekMenuId }, data: { publishedAt: new Date() } })
  })
  revalidatePath(`/admin/dining/venues/${menu.venueId}`)
  revalidatePath(`/dining/${menu.venue.id}`)
  revalidatePath("/dining", "layout")
  return ok("Menu published.")
}

export async function saveClosedDays(weekMenuId: string, closedDays: string[]): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const menu = await db.weekMenu.findUnique({ where: { id: weekMenuId }, include: { venue: true } })
  if (!menu) return fail("Menu not found.")
  if (!(await canEditLocation(user.id, user.role, menu.venue.locationId))) return fail("Not authorized.")
  await db.weekMenu.update({ where: { id: weekMenuId }, data: { closedDays: closedDays.join(",") } })
  revalidatePath(`/admin/dining/venues/${menu.venueId}/menus/${weekMenuId}`)
  revalidatePath(`/dining/${menu.venueId}`)
  return ok("Closed days saved.")
}

export async function unpublishWeekMenu(weekMenuId: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const menu = await db.weekMenu.findUnique({ where: { id: weekMenuId }, include: { venue: true } })
  if (!menu) return fail("Menu not found.")
  if (!(await canEditLocation(user.id, user.role, menu.venue.locationId))) return fail("Not authorized.")
  await db.weekMenu.update({ where: { id: weekMenuId }, data: { publishedAt: null } })
  revalidatePath(`/admin/dining/venues/${menu.venueId}`)
  revalidatePath(`/dining/${menu.venue.id}`)
  revalidatePath("/dining", "layout")
  return ok("Menu unpublished.")
}

export async function deleteWeekMenu(weekMenuId: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const menu = await db.weekMenu.findUnique({ where: { id: weekMenuId }, include: { venue: true } })
  if (!menu) return fail("Menu not found.")
  if (!(await canEditLocation(user.id, user.role, menu.venue.locationId))) return fail("Not authorized.")
  await db.weekMenu.delete({ where: { id: weekMenuId } })
  revalidatePath(`/admin/dining/venues/${menu.venueId}`)
  revalidatePath(`/dining/${menu.venue.id}`)
  return ok("Menu deleted.")
}

// ── Monthly topics ─────────────────────────────────────────────────────────────

type HighlightInput = {
  id?: string
  weekLabel: string
  image?: string | null
  name?: string | null
  description?: string | null
  order: number
}

type TopicInput = {
  title: string
  bannerImage?: string | null
  body?: string | null
  highlights: HighlightInput[]
}

export async function upsertTopic(
  venueId: string,
  topicId: string | null,
  data: TopicInput,
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const venue = await findEditableVenue(user.id, user.role, venueId)
  if (!venue) return fail("Venue not found.")
  if (!data.title.trim()) return fail("Title is required.", "title")

  const fields = {
    title: data.title.trim(),
    bannerImage: data.bannerImage ?? null,
    body: data.body ?? null,
  }

  let topic: { id: string }
  if (topicId) {
    // updateMany scopes by venueId so a foreign topic id cannot be edited here.
    const { count } = await db.monthlyTopic.updateMany({ where: { id: topicId, venueId }, data: fields })
    if (count === 0) return fail("Topic not found.")
    topic = { id: topicId }
  } else {
    topic = await db.monthlyTopic.create({ data: { venueId, ...fields } })
  }

  await db.$transaction(async (tx) => {
    const incomingIds = data.highlights.filter((h) => h.id).map((h) => h.id as string)
    await tx.monthlyTopicHighlight.deleteMany({
      where: { topicId: topic.id, id: { notIn: incomingIds } },
    })
    for (const h of data.highlights) {
      const hFields = { weekLabel: h.weekLabel, image: h.image, name: h.name, description: h.description, order: h.order }
      if (h.id) {
        await tx.monthlyTopicHighlight.updateMany({ where: { id: h.id, topicId: topic.id }, data: hFields })
      } else {
        await tx.monthlyTopicHighlight.create({ data: { topicId: topic.id, ...hFields } })
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${venueId}`)
  revalidatePath(`/dining/${venueId}`)
  revalidatePath(`/dining/${venueId}/topics`)
  return ok("Topic saved.")
}

export async function publishTopic(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const topic = await db.monthlyTopic.findUnique({ where: { id }, include: { venue: true } })
  if (!topic) return fail("Topic not found.")
  if (!(await canEditLocation(user.id, user.role, topic.venue.locationId))) return fail("Not authorized.")
  await db.$transaction([
    db.monthlyTopic.updateMany({
      where: { venueId: topic.venueId, id: { not: id } },
      data: { publishedAt: null },
    }),
    db.monthlyTopic.update({ where: { id }, data: { publishedAt: new Date() } }),
  ])
  revalidatePath(`/admin/dining/venues/${topic.venueId}`)
  revalidatePath(`/dining/${topic.venue.id}`)
  revalidatePath(`/dining/${topic.venue.id}/topics`)
  return ok("Topic set as current.")
}

export async function unpublishTopic(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const topic = await db.monthlyTopic.findUnique({ where: { id }, include: { venue: true } })
  if (!topic) return fail("Topic not found.")
  if (!(await canEditLocation(user.id, user.role, topic.venue.locationId))) return fail("Not authorized.")
  await db.monthlyTopic.update({ where: { id }, data: { publishedAt: null } })
  revalidatePath(`/admin/dining/venues/${topic.venueId}`)
  revalidatePath(`/dining/${topic.venueId}`)
  revalidatePath(`/dining/${topic.venueId}/topics`)
  return ok("Topic unpublished.")
}

export async function deleteTopic(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const topic = await db.monthlyTopic.findUnique({ where: { id }, include: { venue: true } })
  if (!topic) return fail("Topic not found.")
  if (!(await canEditLocation(user.id, user.role, topic.venue.locationId))) return fail("Not authorized.")
  await db.monthlyTopic.delete({ where: { id } })
  // Topics render at /admin/dining/venues/{id}?tab=topics; the /topics route is a redirect stub.
  revalidatePath(`/admin/dining/venues/${topic.venueId}`)
  revalidatePath(`/dining/${topic.venueId}`)
  revalidatePath(`/dining/${topic.venueId}/topics`)
  return ok("Topic deleted.")
}

// ── Fixed menu sections ────────────────────────────────────────────────────────

async function findEditableMenu(userId: string, role: Role, menuId: string) {
  const menu = await db.weekMenu.findUnique({
    where: { id: menuId },
    include: { venue: true },
  })
  if (!menu) return null
  if (!(await canEditLocation(userId, role, menu.venue.locationId))) return null
  return menu
}

type FixedSectionInput = { id?: string; name: string; order: number }

export async function upsertFixedSections(
  menuId: string,
  sections: FixedSectionInput[],
): Promise<ActionResult<{ sections: { id: string; name: string; order: number }[] }>> {
  const user = await requireRole("EDITOR")
  const menu = await findEditableMenu(user.id, user.role, menuId)
  if (!menu) return fail("Menu not found.")

  const saved: { id: string; name: string; order: number }[] = []

  await db.$transaction(async (tx) => {
    const incoming = sections.filter((s) => s.id).map((s) => s.id as string)
    await tx.fixedMenuSection.deleteMany({ where: { weekMenuId: menuId, id: { notIn: incoming } } })
    for (const s of sections) {
      if (s.id) {
        await tx.fixedMenuSection.updateMany({ where: { id: s.id, weekMenuId: menuId }, data: { name: s.name, order: s.order } })
        saved.push({ id: s.id, name: s.name, order: s.order })
      } else {
        const created = await tx.fixedMenuSection.create({ data: { weekMenuId: menuId, name: s.name, order: s.order } })
        saved.push({ id: created.id, name: created.name, order: created.order })
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${menu.venueId}/menus/${menuId}`)
  revalidatePath(`/dining/${menu.venueId}`)
  return okWith({ sections: saved })
}

// ── Fixed menu entries ─────────────────────────────────────────────────────────

type FixedEntryInput = {
  dishId?: string | null
  name?: string | null
  description?: string | null
  photo?: string | null
  price?: number | null
  tagIds?: string
  note?: string | null
}

export async function createFixedEntry(
  sectionId: string,
  data: FixedEntryInput & { nutrition?: Record<string, number | null> | null },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")
  const section = await db.fixedMenuSection.findUnique({
    where: { id: sectionId },
    include: { weekMenu: { include: { venue: true } } },
  })
  if (!section) return fail("Section not found.")
  if (!(await canEditLocation(user.id, user.role, section.weekMenu.venue.locationId))) return fail("Not authorized.")

  const maxOrder = await db.fixedMenuEntry.count({ where: { sectionId } })
  const entry = await db.fixedMenuEntry.create({
    data: {
      sectionId,
      dishId: data.dishId ?? null,
      name: data.name?.trim() || null,
      description: data.description?.trim() || null,
      photo: data.photo ?? null,
      price: data.price != null ? data.price : null,
      nutrition: (data.nutrition ?? undefined) as Prisma.InputJsonValue | undefined,
      tagIds: data.tagIds ?? "",
      note: data.note?.trim() || null,
      order: maxOrder,
    },
  })

  revalidatePath(`/admin/dining/venues/${section.weekMenu.venueId}/menus/${section.weekMenuId}`)
  revalidatePath(`/dining/${section.weekMenu.venueId}`)
  return okWith({ id: entry.id })
}

export async function updateFixedEntry(
  entryId: string,
  data: FixedEntryInput & { order?: number; nutrition?: Record<string, number | null> | null },
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const entry = await db.fixedMenuEntry.findUnique({
    where: { id: entryId },
    include: { section: { include: { weekMenu: { include: { venue: true } } } } },
  })
  if (!entry) return fail("Entry not found.")
  if (!(await canEditLocation(user.id, user.role, entry.section.weekMenu.venue.locationId))) return fail("Not authorized.")

  await db.fixedMenuEntry.update({
    where: { id: entryId },
    data: {
      dishId: data.dishId !== undefined ? (data.dishId ?? null) : undefined,
      name: data.name !== undefined ? (data.name?.trim() || null) : undefined,
      description: data.description !== undefined ? (data.description?.trim() || null) : undefined,
      photo: data.photo !== undefined ? (data.photo ?? null) : undefined,
      price: data.price !== undefined ? (data.price ?? null) : undefined,
      nutrition: data.nutrition !== undefined
        ? ((data.nutrition ?? undefined) as Prisma.InputJsonValue | undefined)
        : undefined,
      tagIds: data.tagIds !== undefined ? data.tagIds : undefined,
      note: data.note !== undefined ? (data.note?.trim() || null) : undefined,
      order: data.order !== undefined ? data.order : undefined,
    },
  })

  revalidatePath(`/admin/dining/venues/${entry.section.weekMenu.venueId}/menus/${entry.section.weekMenuId}`)
  revalidatePath(`/dining/${entry.section.weekMenu.venueId}`)
  return ok("Entry updated.")
}

export async function toggleSoldOut(entryId: string, soldOut: boolean): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const entry = await db.fixedMenuEntry.findUnique({
    where: { id: entryId },
    include: { section: { include: { weekMenu: { include: { venue: true } } } } },
  })
  if (!entry) return fail("Entry not found.")
  if (!(await canEditLocation(user.id, user.role, entry.section.weekMenu.venue.locationId))) return fail("Not authorized.")
  await db.fixedMenuEntry.update({ where: { id: entryId }, data: { soldOut } })
  revalidatePath(`/dining/${entry.section.weekMenu.venueId}`)
  return ok(soldOut ? "Marked as sold out." : "Item available again.")
}

export async function deleteFixedEntry(entryId: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const entry = await db.fixedMenuEntry.findUnique({
    where: { id: entryId },
    include: { section: { include: { weekMenu: { include: { venue: true } } } } },
  })
  if (!entry) return fail("Entry not found.")
  if (!(await canEditLocation(user.id, user.role, entry.section.weekMenu.venue.locationId))) return fail("Not authorized.")
  await db.fixedMenuEntry.delete({ where: { id: entryId } })
  revalidatePath(`/admin/dining/venues/${entry.section.weekMenu.venueId}/menus/${entry.section.weekMenuId}`)
  revalidatePath(`/dining/${entry.section.weekMenu.venueId}`)
  return ok("Entry deleted.")
}

export async function reorderFixedEntries(
  sectionId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const section = await db.fixedMenuSection.findUnique({
    where: { id: sectionId },
    include: { weekMenu: { include: { venue: true } } },
  })
  if (!section) return fail("Section not found.")
  if (!(await canEditLocation(user.id, user.role, section.weekMenu.venue.locationId))) return fail("Not authorized.")

  await db.$transaction(
    orderedIds.map((id, order) =>
      db.fixedMenuEntry.updateMany({ where: { id, sectionId }, data: { order } }),
    ),
  )

  revalidatePath(`/admin/dining/venues/${section.weekMenu.venueId}/menus/${section.weekMenuId}`)
  revalidatePath(`/dining/${section.weekMenu.venueId}`)
  return ok("Order saved.")
}

// ── Fixed menu modifier groups ─────────────────────────────────────────────────

type ModifierOptionInput = {
  id?: string
  label: string
  priceDelta: number
  isDefault: boolean
  color?: string | null
  order: number
}

type ModifierGroupInput = {
  id?: string
  name: string
  required: boolean
  multiSelect: boolean
  order: number
  options: ModifierOptionInput[]
}

export async function saveFixedEntryModifiers(
  entryId: string,
  groups: ModifierGroupInput[],
): Promise<ActionResult> {
  const user = await requireRole("EDITOR")
  const entry = await db.fixedMenuEntry.findUnique({
    where: { id: entryId },
    include: { section: { include: { weekMenu: { include: { venue: true } } } } },
  })
  if (!entry) return fail("Entry not found.")
  if (!(await canEditLocation(user.id, user.role, entry.section.weekMenu.venue.locationId))) return fail("Not authorized.")

  await db.$transaction(async (tx) => {
    const incomingGroupIds = groups.filter((g) => g.id).map((g) => g.id as string)
    await tx.fixedMenuModifierGroup.deleteMany({ where: { entryId, id: { notIn: incomingGroupIds } } })

    for (const g of groups) {
      let groupId: string
      const groupData = { name: g.name, required: g.required, multiSelect: g.multiSelect, order: g.order }
      if (g.id) {
        await tx.fixedMenuModifierGroup.updateMany({ where: { id: g.id, entryId }, data: groupData })
        groupId = g.id
      } else {
        const created = await tx.fixedMenuModifierGroup.create({ data: { entryId, ...groupData } })
        groupId = created.id
      }

      const incomingOptIds = g.options.filter((o) => o.id).map((o) => o.id as string)
      await tx.fixedMenuModifierOption.deleteMany({ where: { groupId, id: { notIn: incomingOptIds } } })

      for (const o of g.options) {
        const optData = { label: o.label, priceDelta: o.priceDelta, isDefault: o.isDefault, color: o.color ?? null, order: o.order }
        if (o.id) {
          await tx.fixedMenuModifierOption.updateMany({ where: { id: o.id, groupId }, data: optData })
        } else {
          await tx.fixedMenuModifierOption.create({ data: { groupId, ...optData } })
        }
      }
    }
  })

  revalidatePath(`/admin/dining/venues/${entry.section.weekMenu.venueId}/menus/${entry.section.weekMenuId}`)
  revalidatePath(`/dining/${entry.section.weekMenu.venueId}`)
  return ok("Modifiers saved.")
}
