import { db } from "@/lib/db"
import Link from "next/link"
import { Plus, Megaphone, Pencil } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { toggleAnnouncementActive, deleteAnnouncement } from "@/lib/actions/announcements"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusToggle } from "@/components/ui/status-toggle"
import { DeleteButton } from "@/components/ui/delete-button"

export const metadata = { title: "Announcements" }

const COLOR_DOT: Record<string, string> = {
  brand:   "bg-brand",
  amber:   "bg-amber-400",
  red:     "bg-red-500",
  emerald: "bg-emerald-500",
}

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

  const fmtDate = (d: Date | null) =>
    d
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
      : null

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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <colgroup>
              <col />
              <col className="w-24" />
              <col className="w-48" />
              <col className="w-24" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                <th className="px-5 py-3 text-left">Message</th>
                <th className="px-5 py-3 text-center">Color</th>
                <th className="px-5 py-3 text-center">Schedule</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 [&_td]:align-top">
              {announcements.map((a) => (
                <tr key={a.id} className="group transition-colors hover:bg-gray-50/70">
                  <td className="px-5 py-3">
                    <p className="truncate text-sm font-medium text-gray-900">{a.message}</p>
                    {a.linkUrl && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">{a.linkUrl}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 capitalize">
                      <span className={`size-2.5 rounded-full ${COLOR_DOT[a.color] ?? "bg-gray-400"}`} aria-hidden />
                      {a.color}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-xs text-gray-500">
                    {a.showFrom || a.showUntil ? (
                      <div className="space-y-0.5">
                        {a.showFrom && <p>From: {fmtDate(a.showFrom)}</p>}
                        {a.showUntil && <p>Until: {fmtDate(a.showUntil)}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-300">Always</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusToggle
                      published={a.active}
                      onToggle={toggleAnnouncementActive.bind(null, a.id)}
                      labelOn="Live"
                      labelOff="Off"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
