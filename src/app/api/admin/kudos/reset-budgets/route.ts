import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/kudos/reset-budgets
 *
 * Called by an external monthly job to signal that the kudos budget window has
 * rolled over. The budget itself is computed on the fly from createdAt timestamps,
 * so there is no state to clear; this endpoint just busts the cached wall page so
 * the new month's counts display immediately.
 *
 * Requires an active admin session (cookie) or can be extended to support a
 * Bearer token by checking the Authorization header against AUTH_SECRET.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  revalidatePath("/kudos")
  revalidatePath("/")
  return Response.json({ ok: true, message: "Kudos budget window refreshed." })
}
