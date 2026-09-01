"use server"

import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { listStorageObjects, copyStorageObject, deleteFromStorage, uploadToStorage } from "@/lib/storage"
import { type ActionResult, ok } from "@/lib/actions/types"
import { gravatarUrl } from "@/lib/gravatar"
import { revalidatePath } from "next/cache"

export async function runMediaMigration(): Promise<ActionResult & { moved?: number; created?: number }> {
  await requireRole("ADMIN")

  // Collect all content-referenced URL sets
  const [dishes, fixedEntries, weekEntries, topics, highlights, siteSettings, users, articles] = await Promise.all([
    db.dish.findMany({ select: { photo: true } }),
    db.fixedMenuEntry.findMany({ select: { photo: true } }),
    db.weekMenuEntry.findMany({ select: { photo: true } }),
    db.monthlyTopic.findMany({ select: { bannerImage: true } }),
    db.monthlyTopicHighlight.findMany({ select: { image: true } }),
    db.siteSettings.findFirst({ select: { logoUrl: true, logoOnLightUrl: true } }),
    db.user.findMany({ select: { avatarUrl: true } }),
    db.article.findMany({ select: { coverImage: true } }),
  ])

  const diningUrls = new Set<string>()
  const logoUrls = new Set<string>()
  const avatarUrls = new Set<string>()
  const articleUrls = new Set<string>()

  function collect(s: Set<string>, url: string | null | undefined) {
    if (url) s.add(url)
  }
  for (const r of dishes) collect(diningUrls, r.photo)
  for (const r of fixedEntries) collect(diningUrls, r.photo)
  for (const r of weekEntries) collect(diningUrls, r.photo)
  for (const r of topics) collect(diningUrls, r.bannerImage)
  for (const r of highlights) collect(diningUrls, r.image)
  if (siteSettings) { collect(logoUrls, siteSettings.logoUrl); collect(logoUrls, siteSettings.logoOnLightUrl) }
  for (const r of users) collect(avatarUrls, r.avatarUrl)
  for (const r of articles) collect(articleUrls, r.coverImage)

  // Process records with null context OR the generic "media" fallback (may have been misclassified on first run)
  const unclassified = await db.media.findMany({
    where: { OR: [{ context: null }, { context: "media" }] },
    select: { id: true, url: true, key: true, mimeType: true, context: true },
  })

  let moved = 0

  for (const record of unclassified) {
    let targetContext: string
    if (diningUrls.has(record.url)) targetContext = "dining"
    else if (logoUrls.has(record.url)) targetContext = "logos"
    else if (avatarUrls.has(record.url)) targetContext = "avatars"
    else if (articleUrls.has(record.url)) targetContext = "articles"
    else targetContext = "media"

    // Skip if context is already correct
    if (record.context === targetContext) continue

    const oldKey = record.key
    const keyParts = oldKey.split("/")
    const filename = keyParts[keyParts.length - 1]
    const newKey = `${targetContext}/${filename}`

    if (oldKey !== newKey) {
      try {
        await copyStorageObject(oldKey, newKey)
        const newUrl = `/uploads/${newKey}`

        await db.media.update({ where: { id: record.id }, data: { key: newKey, url: newUrl, context: targetContext } })

        // Update all tables that may reference the old URL
        const oldUrl = record.url
        await Promise.all([
          db.article.updateMany({ where: { coverImage: oldUrl }, data: { coverImage: newUrl } }),
          db.dish.updateMany({ where: { photo: oldUrl }, data: { photo: newUrl } }),
          db.fixedMenuEntry.updateMany({ where: { photo: oldUrl }, data: { photo: newUrl } }),
          db.weekMenuEntry.updateMany({ where: { photo: oldUrl }, data: { photo: newUrl } }),
          db.monthlyTopic.updateMany({ where: { bannerImage: oldUrl }, data: { bannerImage: newUrl } }),
          db.monthlyTopicHighlight.updateMany({ where: { image: oldUrl }, data: { image: newUrl } }),
          db.user.updateMany({ where: { avatarUrl: oldUrl }, data: { avatarUrl: newUrl } }),
          db.$executeRaw`UPDATE "SiteSettings" SET "logoUrl" = REPLACE("logoUrl", ${oldUrl}, ${newUrl}), "logoOnLightUrl" = REPLACE("logoOnLightUrl", ${oldUrl}, ${newUrl})`,
        ])

        await deleteFromStorage(oldKey).catch(() => {})
        moved++
      } catch (err) {
        console.error(`Migration failed for ${oldKey}:`, err)
      }
    } else {
      // Same key, just set context
      await db.media.update({ where: { id: record.id }, data: { context: targetContext } })
    }
  }

  // Step C: create Media records for bare dining/ objects that have no record
  const diningObjects = await listStorageObjects("dining/")
  const existingKeys = new Set(
    (await db.media.findMany({ where: { key: { startsWith: "dining/" } }, select: { key: true } })).map((r) => r.key)
  )

  let created = 0
  const adminUser = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } })
  if (adminUser) {
    for (const obj of diningObjects) {
      if (existingKeys.has(obj.key)) continue
      const filename = obj.key.split("/").pop() ?? obj.key
      await db.media.create({
        data: {
          filename,
          key: obj.key,
          url: `/uploads/${obj.key}`,
          mimeType: "image/jpeg",
          size: obj.size,
          context: "dining",
          uploadedById: adminUser.id,
        },
      }).catch(() => {})
      created++
    }
  }

  revalidatePath("/admin/media")
  return { ...ok(`Moved ${moved} file${moved === 1 ? "" : "s"}, created ${created} record${created === 1 ? "" : "s"}`), moved, created }
}

export async function cacheAllGravatars(): Promise<ActionResult & { cached?: number; skipped?: number }> {
  await requireRole("ADMIN")

  const settings = await db.siteSettings.findFirst({ select: { gravatarsEnabled: true } })
  if (!settings?.gravatarsEnabled) {
    return { ...ok("Gravatars are disabled"), cached: 0, skipped: 0 }
  }

  const users = await db.user.findMany({ select: { id: true, email: true, avatarUrl: true } })
  let cached = 0
  let skipped = 0

  for (const user of users) {
    if (!user.email) { skipped++; continue }
    const url = gravatarUrl(user.email, 200)
    try {
      const res = await fetch(url)
      if (!res.ok) { skipped++; continue }
      const buffer = Buffer.from(await res.arrayBuffer())
      const key = `avatars/${user.id}.jpg`
      const uploadedUrl = await uploadToStorage(key, buffer, "image/jpeg")

      await db.user.update({ where: { id: user.id }, data: { avatarUrl: uploadedUrl } })

      // Create or update Media record
      await db.media.upsert({
        where: { key },
        create: {
          filename: `${user.id}.jpg`,
          key,
          url: uploadedUrl,
          mimeType: "image/jpeg",
          size: buffer.length,
          context: "avatars",
          uploadedById: user.id,
        },
        update: { url: uploadedUrl, size: buffer.length },
      })
      cached++
    } catch {
      skipped++
    }
  }

  revalidatePath("/admin/media")
  return { ...ok(`Cached ${cached} avatar${cached === 1 ? "" : "s"}, skipped ${skipped}`), cached, skipped }
}
