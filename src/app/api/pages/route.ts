import { db } from "@/lib/db"

export async function GET() {
  const pages = await db.page.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
      parent: { select: { title: true, slug: true } },
      children: {
        where: { published: true },
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: { id: true, title: true, slug: true },
      },
    },
  })
  return Response.json(pages)
}
