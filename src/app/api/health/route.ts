import { db } from "@/lib/db"

/**
 * Liveness and readiness probe.
 *
 * Kubernetes needs a cheap, unauthenticated check. `SELECT 1` proves the pool can
 * still hand out a working connection, which is the failure mode that matters:
 * the process can be alive while the database is unreachable, and a pod in that
 * state should be pulled from the load balancer rather than serving errors.
 *
 * Nothing about the error is echoed back, since an unauthenticated endpoint must
 * not leak connection strings or hostnames.
 */
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json(
      { status: "ok", database: "up" },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    console.error("[health] database check failed", err)
    return Response.json(
      { status: "degraded", database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
