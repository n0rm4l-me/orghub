import { db } from "@/lib/db"
import Link from "next/link"
import { Plus, Megaphone, Pencil } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { toggleAnnouncementActive, deleteAnnouncement } from "@/lib/actions/announcements"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusToggle } from "@/components/ui/status-toggle"
import { DeleteButton } from "@/components/ui/delete-button"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

export const metadata = { title: "Announcements" }

const COLOR_DOT: Record<string, string> = {
  brand:   "bg-brand",
  amber:   "bg-amber-400",
  red:     "bg-red-500",
  emerald: "bg-emerald-500",
}

type AnnouncementRow = {
  id: string
  message: string
  color: string
  active: boolean
  showFrom: Date | null
  showUntil: Date | null
  linkUrl: string | null
}

const fmtDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null

const columns: AdminTableCol<AnnouncementRow>[] = [
  {
    id: "message",
    header: "Message",
    type: "text",
    render: (a) => (
      <>
        <Link
          href={`/admin/announcements/${a.id}/edit`}
          className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-brand"
          title={a.message}
        >
          {a.message}
        </Link>
        {a.linkUrl && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{a.linkUrl}</p>
        )}
      </>
    ),
  },
  {
    id: "color",
    header: "Color",
    width: "w-24",
    type: "center",
    hideOnMobile: true,
    render: (a) => (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 capitalize">
        <span
          className={`size-2.5 rounded-full ${COLOR_DOT[a.color] ?? "bg-gray-400"}`}
          aria-hidden
        />
        {a.color}
      </span>
    ),
  },
  {
    id: "schedule",
    header: "Schedule",
    width: "w-56",
    type: "text",
    hideOnMobile: true,
    render: (a) =>
      a.showFrom || a.showUntil ? (
        <div className="space-y-0.5 text-xs text-gray-500">
          {a.showFrom && <p className="whitespace-nowrap">From: {fmtDate(a.showFrom)}</p>}
          {a.showUntil && <p className="whitespace-nowrap">Until: {fmtDate(a.showUntil)}</p>}
        </div>
      ) : (
        <span className="text-xs text-gray-300">Always</span>
      ),
  },
  {
    id: "status",
    header: "Status",
    width: "w-24",
    type: "center",
    render: (a) => (
      <StatusToggle
        published={a.active}
        onToggle={toggleAnnouncementActive.bind(null, a.id)}
        labelOn="Live"
        labelOff="Off"
      />
    ),
  },
  {
    id: "actions",
    header: "Actions",
    width: "w-28",
    type: "actions",
    render: (a) => (
      <>
        <Link
          href={`/admin/announcements/${a.id}/edit`}
          aria-label="Edit announcement"
          className="grid size-7 place-items-center rounded-md text-gray-400 transition
            hover:bg-gray-100 hover:text-gray-700"
        >
          <Pencil className="size-3.5" aria-hidden />
        </Link>
        <DeleteButton
          entity="announcement"
          name={a.message.slice(0, 40)}
          onDelete={deleteAnnouncement.bind(null, a.id)}
          variant="icon"
        />
      </>
    ),
  },
]

export default async function AnnouncementsPage() {
  await requireRole("EDITOR")

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      color: true,
      active: true,
      showFrom: true,
      showUntil: true,
      linkUrl: true,
    },
  })

  const active = announcements.filter((a) => a.active).length

  return (
    <div>
      <PageHeader
        title="Announcements"
        description={`${active} active · ${announcements.length - active} inactive`}
        action={
          <Link
            href="/admin/announcements/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
              font-medium text-white transition hover:brightness-95 active:brightness-90"
          >
            <Plus className="size-4" aria-hidden />
            New announcement
          </Link>
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Create a banner to notify all portal users at once."
          action={{ label: "Create announcement", href: "/admin/announcements/new" }}
        />
      ) : (
        <AdminTable columns={columns} rows={announcements} rowKey={(a) => a.id} />
      )}
    </div>
  )
}
