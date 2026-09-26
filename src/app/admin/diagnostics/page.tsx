import packageJson from "../../../../package.json"
import nextPackageJson from "next/package.json"
import { db } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { getSettings } from "@/lib/settings"
import { listStorageObjects } from "@/lib/storage"
import { PageHeader } from "@/components/ui/page-header"
import { Panel } from "@/components/ui/field"
import { CheckCircle2, XCircle } from "lucide-react"

export const metadata = { title: "Diagnostics" }

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || d > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(" ")
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground">{value}</span>
    </div>
  )
}

function ConfigRow({ label, configured, detail }: { label: string; configured: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        {detail && <span className="font-mono text-xs text-muted-foreground">{detail}</span>}
        {configured ? (
          <CheckCircle2 className="size-4 text-green-600 dark:text-green-500" aria-label="Configured" />
        ) : (
          <XCircle className="size-4 text-muted-foreground/50" aria-label="Not configured" />
        )}
      </span>
    </div>
  )
}

export default async function DiagnosticsPage() {
  await requireRole("ADMIN")

  const settings = await getSettings()

  const [
    dbVersionRow,
    dbSizeRow,
    userCount,
    articleCount,
    pageCount,
    mediaCount,
    kudosCount,
    suggestionCount,
    pollCount,
    commentCount,
    auditLogCount,
    venueCount,
  ] = await Promise.all([
    db.$queryRaw<{ version: string }[]>`SELECT version()`,
    db.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`,
    db.user.count(),
    db.article.count(),
    db.page.count(),
    db.media.count(),
    db.kudos.count(),
    db.suggestion.count(),
    db.poll.count(),
    db.comment.count(),
    db.auditLog.count(),
    db.venue.count(),
  ])

  // Storage can be slow or unreachable independent of the DB; don't let it
  // take the whole page down if so, just show that it couldn't be read.
  let storageObjects: { key: string; size: number; lastModified: Date }[] | null = null
  let storageError: string | null = null
  try {
    storageObjects = await listStorageObjects()
  } catch {
    storageError = "Could not list storage objects."
  }
  const storageTotalSize = storageObjects?.reduce((sum, o) => sum + o.size, 0) ?? 0

  const memory = process.memoryUsage()
  const buildSha = process.env.BUILD_SHA
  const now = new Date()

  return (
    <div>
      <PageHeader
        title="Diagnostics"
        description="Read-only system information for troubleshooting."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Application">
          <Row label="Version" value={packageJson.version} />
          <Row label="Build" value={buildSha ?? "unknown (not set)"} />
          <Row label="Next.js" value={nextPackageJson.version} />
          <Row label="Node.js" value={process.version} />
          <Row label="Environment" value={process.env.NODE_ENV ?? "unknown"} />
          <Row label="Uptime" value={formatUptime(process.uptime())} />
          <Row label="Server time" value={now.toISOString()} />
          <Row label="Memory (RSS)" value={formatBytes(memory.rss)} />
          <Row label="Memory (heap used)" value={formatBytes(memory.heapUsed)} />
        </Panel>

        <Panel title="Database">
          <Row label="Engine" value={dbVersionRow[0]?.version.split(",")[0] ?? "unknown"} />
          <Row label="Database size" value={dbSizeRow[0]?.size ?? "unknown"} />
          <Row label="Users" value={userCount} />
          <Row label="Articles" value={articleCount} />
          <Row label="Pages" value={pageCount} />
          <Row label="Media rows" value={mediaCount} />
          <Row label="Kudos sent" value={kudosCount} />
          <Row label="Suggestions" value={suggestionCount} />
          <Row label="Polls" value={pollCount} />
          <Row label="Comments" value={commentCount} />
          <Row label="Audit log entries" value={auditLogCount} />
          <Row label="Dining venues" value={venueCount} />
        </Panel>

        <Panel title="Storage" description={process.env.S3_ENDPOINT ? undefined : "Not configured"}>
          <Row label="Endpoint" value={process.env.S3_ENDPOINT ?? "not set"} />
          <Row label="Bucket" value={process.env.S3_BUCKET ?? "orghub"} />
          {storageError ? (
            <p className="py-1.5 text-sm text-red-600 dark:text-red-400">{storageError}</p>
          ) : (
            <>
              <Row label="Objects" value={storageObjects?.length ?? 0} />
              <Row label="Total size" value={formatBytes(storageTotalSize)} />
            </>
          )}
        </Panel>

        <Panel title="Configuration">
          <ConfigRow label="LDAP" configured={!!process.env.LDAP_URL} detail={process.env.LDAP_URL ? new URL(process.env.LDAP_URL).host : undefined} />
          <ConfigRow label="Okta SSO" configured={!!process.env.AUTH_OKTA_ID} />
          <ConfigRow label="Local password auth" configured={settings.localAuthEnabled} />
          <ConfigRow label="Gravatar" configured={settings.gravatarsEnabled} />
          <ConfigRow
            label="Translation provider"
            configured={settings.translationProvider === "mymemory" || !!process.env.DEEPL_API_KEY || !!process.env.HF_TOKEN}
            detail={settings.translationProvider}
          />
          <ConfigRow label="Web push (VAPID)" configured={!!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY} />
          <ConfigRow label="S3-compatible storage" configured={!!process.env.S3_ENDPOINT} />
        </Panel>
      </div>
    </div>
  )
}
