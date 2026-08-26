import { headers } from "next/headers"
import { db } from "@/lib/db"

export type AuditAction =
  | "article.create"
  | "article.update"
  | "article.delete"
  | "article.publish"
  | "article.unpublish"
  | "article.pin"
  | "article.unpin"
  | "article.mark_important"
  | "article.unmark_important"
  | "announcement.create"
  | "announcement.update"
  | "announcement.delete"
  | "announcement.activate"
  | "announcement.deactivate"
  | "page.create"
  | "page.update"
  | "page.delete"
  | "page.publish"
  | "page.unpublish"
  | "category.create"
  | "category.delete"
  | "nav.update"
  | "link.create"
  | "link.update"
  | "link.delete"
  | "user.role_change"
  | "user.deactivate"
  | "user.reactivate"
  | "settings.branding"
  | "settings.theme"
  | "settings.navigation"
  | "settings.modules"
  | "settings.layout"
  | "settings.localAuth"
  | "settings.gravatars"

interface LogInput {
  userId: string
  action: AuditAction
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

/**
 * Appends an entry to the audit trail.
 *
 * Never throws: an audit write failing must not roll back or mask the business
 * operation the user actually asked for. Failures are logged to stderr so they
 * surface in container logs.
 */
export async function logAudit({
  userId,
  action,
  resourceType,
  resourceId,
  metadata,
}: LogInput): Promise<void> {
  try {
    const h = await headers()
    await db.auditLog.create({
      data: {
        userId,
        action,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent") ?? null,
      },
    })
  } catch (err) {
    console.error("[audit] failed to record", action, err)
  }
}
