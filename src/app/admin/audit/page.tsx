import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { ScrollText } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { TablePagination } from "@/components/ui/table-pagination"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

export const metadata = { title: "Audit log" }

const PER_PAGE = 50

const VERB: Record<string, string> = {
  "article.create": "created article",
  "article.update": "edited article",
  "article.delete": "deleted article",
  "article.publish": "published article",
  "article.unpublish": "unpublished article",
  "page.create": "created page",
  "page.update": "edited page",
  "page.delete": "deleted page",
  "page.publish": "published page",
  "page.unpublish": "unpublished page",
  "category.create": "created category",
  "category.delete": "deleted category",
  "nav.update": "changed the menu",
  "link.create": "added quick link",
  "link.update": "reordered quick links",
  "link.delete": "removed quick link",
  "user.role_change": "changed a role",
  "user.deactivate": "deactivated a user",
  "user.reactivate": "reactivated a user",
  "settings.branding": "updated branding",
  "settings.theme": "updated the theme",
}

const SENSITIVE = new Set([
  "user.role_change",
  "user.deactivate",
  "user.reactivate",
  "settings.branding",
  "settings.theme",
])

const GROUPS: Record<string, string> = {
  all: "All activity",
  content: "Content",
  users: "Access",
  settings: "Settings",
}

const PREFIXES: Record<string, string[]> = {
  content: ["article.", "page.", "category.", "nav.", "link."],
  users: ["user."],
  settings: ["settings."],
}

type AuditRow = {
  id: string
  action: string
  metadata: Prisma.JsonValue
  ip: string | null
  createdAt: Date
  user: { name: string | null; email: string } | null
}

const columns: AdminTableCol<AuditRow>[] = [
  {
    id: "when",
    header: "When",
    width: "w-36",
    type: "date",
    render: (entry) =>
      entry.createdAt.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
  {
    id: "who",
    header: "Who",
    width: "w-48",
    type: "text",
    hideOnMobile: true,
    render: (entry) => (
      <p className="truncate text-sm text-gray-700">
        {entry.user?.name ?? entry.user?.email ?? "Deleted user"}
      </p>
    ),
  },
  {
    id: "what",
    header: "What",
    type: "text",
    render: (entry) => {
      const meta = (entry.metadata ?? null) as Record<string, unknown> | null
      const subject =
        typeof meta?.title === "string"
          ? meta.title
          : typeof meta?.name === "string"
            ? meta.name
            : typeof meta?.email === "string"
              ? meta.email
              : null
      const detail =
        typeof meta?.from === "string" && typeof meta?.to === "string"
          ? `${String(meta.from).toLowerCase()} → ${String(meta.to).toLowerCase()}`
          : null
      return (
        <p>
          <span
            className={`text-sm ${
              SENSITIVE.has(entry.action) ? "font-medium text-gray-900" : "text-gray-600"
            }`}
          >
            {VERB[entry.action] ?? entry.action}
          </span>
          {subject && (
            <span className="ml-1 text-sm text-gray-400">&ldquo;{subject}&rdquo;</span>
          )}
          {detail && (
            <span className="ml-1.5 font-mono text-xs text-gray-400">{detail}</span>
          )}
        </p>
      )
    },
  },
  {
    id: "from",
    header: "From",
    width: "w-32",
    type: "center",
    hideOnMobile: true,
    render: (entry) => (
      <span className="font-mono text-xs text-gray-300">{entry.ip ?? "—"}</span>
    ),
  },
]

interface Props {
  searchParams: Promise<{ group?: string; page?: string }>
}

export default async function AuditPage({ searchParams }: Props) {
  await requireRole("ADMIN")

  const params = await searchParams
  const group = params.group && params.group in PREFIXES ? params.group : "all"
  const page = Math.max(1, Number(params.page) || 1)

  const where: Prisma.AuditLogWhereInput =
    group === "all"
      ? {}
      : { OR: PREFIXES[group]!.map((prefix) => ({ action: { startsWith: prefix } })) }

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        metadata: true,
        ip: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.auditLog.count({ where }),
  ])

  const tab = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition ${
      active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
    }`

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Every change made through the admin, newest first."
      />

      <div
        className="mb-4 flex w-fit items-center gap-0.5 rounded-lg bg-gray-100 p-0.5"
        role="group"
        aria-label="Filter activity"
      >
        {Object.entries(GROUPS).map(([key, label]) => (
          <Link
            key={key}
            href={key === "all" ? "/admin/audit" : `/admin/audit?group=${key}`}
            className={tab(group === key)}
          >
            {label}
          </Link>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing recorded yet"
          description="Entries appear here as soon as someone publishes, edits, or changes a setting."
        />
      ) : (
        <AdminTable columns={columns} rows={entries} rowKey={(e) => e.id} />
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/admin/audit"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}
    </div>
  )
}
