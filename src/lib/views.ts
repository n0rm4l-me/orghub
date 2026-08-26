import { db } from "@/lib/db"

export async function recordView(articleId: string, userId: string) {
  await db.articleView.upsert({
    where: { articleId_userId: { articleId, userId } },
    create: { articleId, userId },
    update: { viewedAt: new Date() },
  })
}
