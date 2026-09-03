"use server"

import { Client } from "ldapts"
import sharp from "sharp"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { uploadToStorage } from "@/lib/storage"

async function resizeAvatar(buf: Buffer): Promise<Buffer> {
  return sharp(buf).resize(256, 256, { fit: "cover" }).jpeg({ quality: 85 }).toBuffer()
}

export type SyncResult = {
  synced: number
  skipped: number
  failed: number
}

export async function syncAdPhotos(): Promise<SyncResult> {
  await requireRole("ADMIN")

  const url = process.env.LDAP_URL
  const bindDn = process.env.LDAP_BIND_DN
  const bindPassword = process.env.LDAP_BIND_PASSWORD
  const searchBase = process.env.LDAP_USER_SEARCH_BASE
  if (!url || !bindDn || !bindPassword || !searchBase) {
    return { synced: 0, skipped: 0, failed: 0 }
  }

  const users = await db.user.findMany({
    where: { provider: "ldap", active: true },
    select: { id: true, email: true },
  })

  if (!users.length) return { synced: 0, skipped: 0, failed: 0 }

  const client = new Client({ url, timeout: 10000, tlsOptions: { rejectUnauthorized: false } })
  let synced = 0, skipped = 0, failed = 0

  try {
    await client.bind(bindDn, bindPassword)

    for (const user of users) {
      try {
        const sanitized = user.email.replace(/[()\\*/\x00]/g, "")
        const { searchEntries } = await client.search(searchBase, {
          scope: "sub",
          filter: `(mail=${sanitized})`,
          attributes: ["thumbnailPhoto"],
          sizeLimit: 1,
        })

        if (!searchEntries.length) { skipped++; continue }

        const raw = searchEntries[0].thumbnailPhoto
        const photo = Buffer.isBuffer(raw) ? raw
          : Array.isArray(raw) && Buffer.isBuffer(raw[0]) ? raw[0]
          : null

        if (!photo) { skipped++; continue }

        const resized = await resizeAvatar(photo)
        const avatarUrl = await uploadToStorage(`avatars/${user.id}.jpg`, resized, "image/jpeg")
        await db.user.update({ where: { id: user.id }, data: { avatarUrl } })
        synced++
      } catch {
        failed++
      }
    }
  } finally {
    try { await client.unbind() } catch {}
  }

  return { synced, skipped, failed }
}
