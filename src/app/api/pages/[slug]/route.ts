import { db } from "@/lib/db"
import { NextRequest } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const page = await db.page.findUnique({
    where: { slug, published: true },
    select: {
      id: true,
      title: true,
      slug: true,
      body: true,
      updatedAt: true,
      parent: { select: { title: true, slug: true } },
      children: {
        where: { published: true },
        orderBy: [{ order: "asc" }, { title: "asc" }],
        select: { id: true, title: true, slug: true },
      },
    },
  })
  if (!page) return new Response("Not found", { status: 404 })
  return Response.json(page)
}
