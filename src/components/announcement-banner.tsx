import { db } from "@/lib/db"
import { AnnouncementBannerClient } from "./announcement-banner-client"

export async function AnnouncementBanner() {
  const now = new Date()

  const announcement = await db.announcement.findFirst({
    where: {
      active: true,
      OR: [{ showFrom: null }, { showFrom: { lte: now } }],
      AND: [{ OR: [{ showUntil: null }, { showUntil: { gte: now } }] }],
    },
    select: { id: true, message: true, linkUrl: true, linkLabel: true, color: true },
  })

  if (!announcement) return null

  return <AnnouncementBannerClient announcement={announcement} />
}
