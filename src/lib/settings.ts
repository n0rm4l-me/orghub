import { db } from "@/lib/db"

export async function getSettings() {
  return db.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  })
}
