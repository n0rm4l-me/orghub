import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { Plus, FileText, Pencil, Eye } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { togglePublish, deleteArticle, pinArticle, markImportant } from "@/lib/actions/articles"
import { StatusToggle } from "@/components/ui/status-toggle"
import { DeleteButton } from "@/components/ui/delete-button"
import { PinButton } from "@/components/pin-button"
import { ImportantButton } from "@/components/important-button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { AdminFilters } from "@/components/admin-filters"
import { TablePagination } from "@/components/ui/table-pagination"
import { AdminTable } from "@/components/ui/admin-table"
import type { AdminTableCol } from "@/components/ui/admin-table"

export const metadata = { title: "Articles" }

const PER_PAGE = 20

interface Props {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

type ArticleRow = {
  id: string
  title: string
  excerpt: string | null
  published: boolean
  pinned: boolean
  important: boolean
  updatedAt: Date
  author: { name: string | null; email: string }
  categories: { category: { name: string } }[]
  _count: { views: number }
}

const columns: AdminTableCol<ArticleRow>[] = [
  {
    id: "title",
    header: "Title",
    type: "text",
    render: (a) => (
      <>
        <Link
          href={`/admin/articles/${a.id}/edit`}
          className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-brand"
          title={a.title}
        >
          {a.title}
        </Link>
        {a.excerpt && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{a.excerpt}</p>
        )}
      </>
    ),
  },
  {
    id: "category",
    header: "Category",
    width: "w-36",
    type: "center",
    render: (a) =>
      a.categories[0] ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <span className="inline-block max-w-full truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {a.categories[0].category.name}
          </span>
          {a.categories.length > 1 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">
              +{a.categories.length - 1}
            </span>
          )}
        </div>
      ) : null,
  },
  {
    id: "author",
    header: "Author",
    width: "w-36",
    type: "center",
    render: (a) => (
      <span className="truncate text-sm text-gray-500">
        {a.author.name ?? a.author.email}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "w-28",
    type: "center",
    render: (a) => (
      <StatusToggle published={a.published} onToggle={togglePublish.bind(null, a.id)} />
    ),
  },
  {
    id: "updated",
    header: "Updated",
    width: "w-24",
    type: "date",
    render: (a) =>
      a.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  },
  {
    id: "views",
    header: <Eye className="size-3.5 mx-auto" aria-hidden />,
    headerTitle: "Unique readers",
    width: "w-12",
    type: "number",
    render: (a) => a._count.views,
  },
  {
    id: "actions",
    header: "Actions",
    width: "w-36",
    type: "actions",
    render: (a) => (
      <>
        <span className={a.published ? undefined : "invisible"}>
          <PinButton
            initialPinned={a.pinned}
            onPin={pinArticle.bind(null, a.id)}
            className="grid size-7 place-items-center rounded-md hover:bg-gray-100"
          />
        </span>
        <span className={a.published ? undefined : "invisible"}>
          <ImportantButton
            initialImportant={a.important}
            onMark={markImportant.bind(null, a.id)}
            className="grid size-7 place-items-center rounded-md hover:bg-gray-100"
          />
        </span>
        <Link
          href={`/admin/articles/${a.id}/edit`}
          aria-label="Edit article"
          className="grid size-7 place-items-center rounded-md text-gray-400 transition
            hover:bg-gray-100 hover:text-gray-700"
        >
          <Pencil className="size-3.5" aria-hidden />
        </Link>
        <DeleteButton
          entity="article"
          name={a.title}
          onDelete={deleteArticle.bind(null, a.id)}
          variant="icon"
        />
      </>
    ),
  },
]

export default async function ArticlesPage({ searchParams }: Props) {
  await requireRole("EDITOR")

  const params = await searchParams
  const query = params.q?.trim() || undefined
  const status = params.status === "published" || params.status === "draft" ? params.status : undefined
  const page = Math.max(1, Number(params.page) || 1)

  const where: Prisma.ArticleWhereInput = {
    eventDate: null,
    ...(status ? { published: status === "published" } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { excerpt: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [articles, total, counts] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        excerpt: true,
        published: true,
        pinned: true,
        important: true,
        updatedAt: true,
        author: { select: { name: true, email: true } },
        categories: { select: { category: { select: { name: true } } } },
        _count: { select: { views: true } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.article.count({ where }),
    db.article.groupBy({ by: ["published"], _count: true }),
  ])

  const published = counts.find((c) => c.published)?._count ?? 0
  const drafts = counts.find((c) => !c.published)?._count ?? 0
  const filtering = Boolean(query || status)

  return (
    <div>
      <PageHeader
        title="Articles"
        description={`${published} published · ${drafts} draft${drafts === 1 ? "" : "s"}`}
        action={
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
              font-medium text-white transition hover:brightness-95 active:brightness-90"
          >
            <Plus className="size-4" aria-hidden />
            New article
          </Link>
        }
      />

      <AdminFilters
        basePath="/admin/articles"
        query={query}
        status={status}
        placeholder="Search articles"
      />

      {total === 0 ? (
        filtering ? (
          <EmptyState
            icon={FileText}
            title="Nothing matched"
            description="Try a different search term or clear the status filter."
            action={{ label: "Show all articles", href: "/admin/articles" }}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No articles yet"
            description="Articles are the news items on the portal feed."
            action={{ label: "Write your first article", href: "/admin/articles/new" }}
          />
        )
      ) : (
        <AdminTable columns={columns} rows={articles} rowKey={(a) => a.id} />
      )}

      {total > PER_PAGE && (
        <TablePagination
          basePath="/admin/articles"
          page={page}
          totalPages={Math.ceil(total / PER_PAGE)}
          params={params}
        />
      )}
    </div>
  )
}
