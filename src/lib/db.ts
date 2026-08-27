import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Connections are the first hard ceiling on replica count. Each pod holds its own pool,
 * so the cluster-wide total is `replicas × max`, and Postgres only accepts
 * `max_connections` (100 by default). The `pg` default of 10 per pool would exhaust
 * that at ten pods, which is well below where a portal would otherwise need to stop.
 *
 * A small pool trades a little per-pod concurrency for a lot of headroom, and the
 * queries here are short enough that the trade costs nothing measurable. Put PgBouncer
 * in front of Postgres to push the ceiling further out.
 */
const POOL_MAX = Number(process.env.DB_POOL_MAX) || 5

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
    max: POOL_MAX,
  })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
