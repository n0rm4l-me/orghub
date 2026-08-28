import { db } from "@/lib/db"
import { sendPushToUser } from "@/lib/web-push"

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  href?: string,
) {
  await db.notification.create({ data: { userId, type, title, body, href } })
  await sendPushToUser(userId, title, body, href).catch(() => {})
}
