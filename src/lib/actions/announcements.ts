"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import { type ActionResult, ok, okWith, fail } from "@/lib/actions/types"

const MESSAGE_MAX = 300

function revalidateAll() {
  revalidatePath("/", "layout")
  revalidatePath("/admin/announcements")
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("EDITOR")

  const message = ((formData.get("message") as string) ?? "").trim()
  if (!message) return fail("Message is required.", "message")
  if (message.length > MESSAGE_MAX)
    return fail(`Message must be ${MESSAGE_MAX} characters or fewer.`, "message")

  const linkUrl = ((formData.get("linkUrl") as string) ?? "").trim() || null
  const linkLabel = ((formData.get("linkLabel") as string) ?? "").trim() || null
  const color = ((formData.get("color") as string) ?? "brand").trim()
  const showFromRaw = ((formData.get("showFrom") as string) ?? "").trim()
  const showUntilRaw = ((formData.get("showUntil") as string) ?? "").trim()

  const showFrom = showFromRaw ? new Date(showFromRaw) : null
  const showUntil = showUntilRaw ? new Date(showUntilRaw) : null

  if (showFrom && isNaN(showFrom.getTime())) return fail("Invalid start time.", "showFrom")
  if (showUntil && isNaN(showUntil.getTime())) return fail("Invalid end time.", "showUntil")
  if (showFrom && showUntil && showUntil <= showFrom)
    return fail("End time must be after start time.", "showUntil")

  const announcement = await db.$transaction(async (tx) => {
    await tx.announcement.updateMany({ data: { active: false } })
    return tx.announcement.create({
      data: { message, linkUrl, linkLabel, color, showFrom, showUntil, active: true },
      select: { id: true },
    })
  })

  await logAudit({
    userId: user.id,
    action: "announcement.create",
    resourceType: "Announcement",
    resourceId: announcement.id,
    metadata: { message },
  })

  revalidateAll()
  return okWith(announcement, "Announcement created.")
}

export async function updateAnnouncement(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.announcement.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return fail("Announcement not found.")

  const message = ((formData.get("message") as string) ?? "").trim()
  if (!message) return fail("Message is required.", "message")
  if (message.length > MESSAGE_MAX)
    return fail(`Message must be ${MESSAGE_MAX} characters or fewer.`, "message")

  const linkUrl = ((formData.get("linkUrl") as string) ?? "").trim() || null
  const linkLabel = ((formData.get("linkLabel") as string) ?? "").trim() || null
  const color = ((formData.get("color") as string) ?? "brand").trim()
  const showFromRaw = ((formData.get("showFrom") as string) ?? "").trim()
  const showUntilRaw = ((formData.get("showUntil") as string) ?? "").trim()

  const showFrom = showFromRaw ? new Date(showFromRaw) : null
  const showUntil = showUntilRaw ? new Date(showUntilRaw) : null

  if (showFrom && isNaN(showFrom.getTime())) return fail("Invalid start time.", "showFrom")
  if (showUntil && isNaN(showUntil.getTime())) return fail("Invalid end time.", "showUntil")
  if (showFrom && showUntil && showUntil <= showFrom)
    return fail("End time must be after start time.", "showUntil")

  await db.announcement.update({
    where: { id },
    data: { message, linkUrl, linkLabel, color, showFrom, showUntil },
  })

  await logAudit({
    userId: user.id,
    action: "announcement.update",
    resourceType: "Announcement",
    resourceId: id,
    metadata: { message },
  })

  revalidateAll()
  return ok("Announcement saved.")
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.announcement.findUnique({ where: { id }, select: { message: true } })
  if (!existing) return fail("Announcement not found.")

  await db.announcement.delete({ where: { id } })

  await logAudit({
    userId: user.id,
    action: "announcement.delete",
    resourceType: "Announcement",
    resourceId: id,
    metadata: { message: existing.message },
  })

  revalidateAll()
  return ok("Announcement deleted.")
}

export async function toggleAnnouncementActive(id: string): Promise<ActionResult> {
  const user = await requireRole("EDITOR")

  const existing = await db.announcement.findUnique({ where: { id }, select: { active: true, message: true } })
  if (!existing) return fail("Announcement not found.")

  const activating = !existing.active

  await db.$transaction(async (tx) => {
    if (activating) {
      await tx.announcement.updateMany({ where: { id: { not: id } }, data: { active: false } })
    }
    await tx.announcement.update({ where: { id }, data: { active: activating } })
  })

  await logAudit({
    userId: user.id,
    action: activating ? "announcement.activate" : "announcement.deactivate",
    resourceType: "Announcement",
    resourceId: id,
    metadata: { message: existing.message },
  })

  revalidateAll()
  return ok(activating ? "Announcement is now live." : "Announcement deactivated.")
}
