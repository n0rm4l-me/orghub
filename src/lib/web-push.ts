import webpush from "web-push"
import { db } from "@/lib/db"

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_EMAIL   = process.env.VAPID_EMAIL

if (VAPID_PUBLIC && VAPID_PRIVATE && VAPID_EMAIL) {
  webpush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC, VAPID_PRIVATE)
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body?: string,
  href?: string,
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return

  const subs = await db.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  const payload = JSON.stringify({ title, body, href })
  const expired: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          expired.push(sub.endpoint)
        }
      }
    }),
  )

  if (expired.length > 0) {
    await db.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } })
  }
}
