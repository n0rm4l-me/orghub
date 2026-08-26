import { cache } from "react"
import { db } from "@/lib/db"

/**
 * Pages linked from the main menu.
 *
 * Cached per request because the header renders on every route and the feed
 * needs the same list.
 */
export const getNavPages = cache(async () =>
  db.page.findMany({
    where: { published: true, showInNav: true, parentId: null },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      children: {
        where: { published: true, showInNav: true },
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: { id: true, title: true, slug: true },
      },
    },
    take: 8,
  })
)

export const getQuickLinks = cache(async () =>
  db.quickLink.findMany({
    orderBy: [{ order: "asc" }, { label: "asc" }],
    select: { id: true, label: true, url: true },
  })
)

export const getUpcomingEvents = cache(async () =>
  db.article.findMany({
    where: { published: true, eventDate: { gte: new Date() } },
    orderBy: { eventDate: "asc" },
    take: 4,
    select: { id: true, title: true, eventDate: true, eventLocation: true },
  })
)
