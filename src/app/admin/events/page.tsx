import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { Plus, CalendarDays, MapPin, Pencil } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { togglePublish, deleteArticle } from "@/lib/actions/articles"
import { StatusToggle } from "@/components/ui/status-toggle"
import { DeleteButton } from "@/components/ui/delete-button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { TablePagination } from "@/components/ui/table-pagination"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

export const metadata = { title: "Events" }

const PER_PAGE = 20

interface Props {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

type EventRow = {
  id: string
  title: string
  published: boolean
  eventDate: Date | null
  eventEndDate: Date | null
  eventLocation: string | null
  author: { name: string | null; email: string }
}

const columns: AdminTableCol<EventRow>[] = [
  {
    id: "title",
    header: "Title",
    type: "text",
    render: (ev) => (
      <>
        <Link
          href={`/admin/events/${ev.id}/edit`}
          className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-brand"
          title={ev.title}
        >
          {ev.title}
        </Link>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {ev.author.name ?? ev.author.email}
        </p>
      </>
    ),
  },
  {
    id: "date",
    header: "Date",
    width: "w-44",
    type: "text",
    render: (ev) => {
      const start = new Date(ev.eventDate!)
      const end = ev.eventEndDate ? new Date(ev.eventEndDate) : null
      const sameDay = end && start.toDateString() === end.toDateString()
      const dateLabel = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      const timeLabel = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
      const endTime = end
        ? end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : null
      return (
        <>
          <p className="text-xs font-medium text-gray-900">{dateLabel}</p>
          <p className="mt-0.5 text-xs text-gray-400 whitespace-nowrap">
            {timeLabel}
            {endTime && sameDay && ` – ${endTime}`}
            {end && !sameDay && (
              ` – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            )}
          </p>
        </>
      )
    },
  },
  {
    id: "location",
    header: "Location",
    width: "w-36",
    type: "text",
    hideOnMobile: true,
    render: (ev) =>
      ev.eventLocation ? (
        <span className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
          <MapPin className="size-3 shrink-0 text-gray-400" aria-hidden />
          <span className="truncate" title={ev.eventLocation}>
            {ev.eventLocation}
          </span>
        </span>
      ) : (
        <span className="text-xs text-gray-300">—</span>
      ),
  },
  {
    id: "status",
    header: "Status",
    width: "w-28",
    type: "center",
    render: (ev) => (
      <StatusToggle published={ev.published} onToggle={togglePublish.bind(null, ev.id)} />
    ),
  },
  {
    id: "actions",
    header: "Actions",
    width: "w-28",
    type: "actions",
    render: (ev) => (
      <>
        <Link
          href={`/admin/events/${ev.id}/edit`}
          aria-label="Edit event"
          className="grid size-7 place-items-center rounded-md text-gray-400 transition
            hover:bg-gray-100 hover:text-gray-700"
        >
          <Pencil className="size-3.5" aria-hidden />
        </Link>
        <DeleteButton
          entity="event"
          name={ev.title}
          onDelete={deleteArticle.bind(null, ev.id)}
          variant="icon"
        />
      </>
    ),
  },
]

export default async function AdminEventsPage({ searchParams }: Props) {
  await requireRole("EDITOR")

  const params = await searchParams
  const query = params.q?.trim() || undefined
  const status = params.status === "published" || params.status === "draft" ? params.status : undefined
  const page = Math.max(1, Number(params.page) || 1)

  const where: Prisma.ArticleWhereInput = {
    eventDate: { not: null },
    ...(status ? { published: status === "published" } : {}),
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
  }

  const [events, total, publishedCount, draftCount] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: { eventDate: "asc" },
      select: {
        id: true,
        title: true,
        published: true,
        eventDate: true,
        eventEndDate: true,
        eventLocation: true,
        author: { select: { name: true, email: true } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.article.count({ where }),
    db.article.count({ where: { eventDate: { not: null }, published: true } }),
    db.article.count({ where: { eventDate: { not: null }, published: false } }),
  ])

  const filtering = Boolean(query || status)

  return (
    <div>
      <PageHeader
        title="Events"
        description={`${publishedCount} published · ${draftCount} draft${draftCount === 1 ? "" : "s"}`}
        action={
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
              font-medium text-white transition hover:brightness-95 active:brightness-90"
          >
            <Plus className="size-4" aria-hidden />
            New event
          </Link>
        }
      />

      <AdminFilters
        basePath="/admin/events"
        query={query}
        status={status}
        placeholder="Search events"
      />

      {total === 0 ? (
        filtering ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing matched"
            description="Try a different search term or clear the status filter."
            action={{ label: "Show all events", href: "/admin/events" }}
          />
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create an article and fill in the Event section to add it to the calendar."
            action={{ label: "Create first event", href: "/admin/events/new" }}
          />
        )
      ) : (
        <AdminTable columns={columns} rows={events} rowKey={(ev) => ev.id} rowAlign="middle" />
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/admin/events"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}
    </div>
  )
}
