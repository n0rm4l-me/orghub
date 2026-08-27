import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import Link from "next/link"
import { Plus, FileText, Pin, Star, Pencil, Eye } from "lucide-react"
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

export const metadata = { title: "Articles" }

const PER_PAGE = 20

interface Props {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-9" />
              <col className="w-9" />
              <col />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-28" />
              <col className="w-24" />
              <col className="w-12" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr
                className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400
                  uppercase"
              >
                <th className="px-1 py-3 text-center" title="Pin as featured">
                  <Pin className="size-3.5 mx-auto" aria-hidden />
                </th>
                <th className="px-1 py-3 text-center" title="Mark as important">
                  <Star className="size-3.5 mx-auto" aria-hidden />
                </th>
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-center">Category</th>
                <th className="px-5 py-3 text-center">Author</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Updated</th>
                <th className="px-2 py-3 text-center" title="Unique readers">
                  <Eye className="size-3.5 mx-auto" aria-hidden />
                </th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 [&_td]:align-top">
              {articles.map((article) => (
                <tr key={article.id} className="group transition-colors hover:bg-gray-50/70">
                  <td className="px-0.5 py-3 !align-middle text-center">
                    {article.published && (
                      <span className="inline-block translate-y-px">
                        <PinButton
                          initialPinned={article.pinned}
                          onPin={pinArticle.bind(null, article.id)}
                        />
                      </span>
                    )}
                  </td>
                  <td className="px-0.5 py-3 !align-middle text-center">
                    {article.published && (
                      <ImportantButton
                        initialImportant={article.important}
                        onMark={markImportant.bind(null, article.id)}
                      />
                    )}
                  </td>
                  <td className="py-3 pl-1 pr-5">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="block truncate text-sm font-medium text-gray-900 transition-colors
                        hover:text-brand"
                      title={article.title}
                    >
                      {article.title}
                    </Link>
                    {article.excerpt && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">{article.excerpt}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {article.categories[0] && (
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <span className="inline-block max-w-full truncate rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {article.categories[0].category.name}
                        </span>
                        {article.categories.length > 1 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400">
                            +{article.categories.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="truncate px-5 py-3 text-center text-sm text-gray-500">
                    {article.author.name ?? article.author.email}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <StatusToggle
                      published={article.published}
                      onToggle={togglePublish.bind(null, article.id)}
                    />
                  </td>
                  <td className="px-5 py-3 text-center text-xs whitespace-nowrap text-gray-400">
                    {article.updatedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-2 py-3 text-center text-xs text-gray-400">
                    {article._count.views}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        aria-label="Edit article"
                        className="grid size-7 place-items-center rounded-md text-gray-400 transition
                          hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Link>
                      <DeleteButton
                        entity="article"
                        name={article.title}
                        onDelete={deleteArticle.bind(null, article.id)}
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
