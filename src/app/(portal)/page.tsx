import Link from "next/link"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { CalendarDays, ExternalLink, MapPin, Newspaper, SearchX, Zap } from "lucide-react"
import { CategoryFilter } from "@/components/category-filter"
import { EmptyState } from "@/components/ui/empty-state"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { getCurrentUser, can } from "@/lib/rbac"

const PER_PAGE = 15
const WORDS_PER_MINUTE = 200

interface Props {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>
}

function initialsOf(name: string | null): string {
  return (
    (name ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  )
}

const dateFormat: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
}

export default async function FeedPage({ searchParams }: Props) {
  const params = await searchParams
  const categorySlug = params.category?.trim() || undefined
  const query = params.q?.trim() || undefined
  const page = Math.max(1, Number(params.page) || 1)

  const where: Prisma.ArticleWhereInput = {
    published: true,
    ...(categorySlug ? { categories: { some: { category: { slug: categorySlug } } } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { excerpt: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [articles, total, categories, quickLinks, upcomingEvents, user] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        body: true,
        publishedAt: true,
        author: { select: { name: true } },
        categories: { select: { category: { select: { name: true, slug: true } } } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.article.count({ where }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    getQuickLinks(),
    getUpcomingEvents(),
    getCurrentUser(),
  ])

  const mapped = articles.map((a) => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt ?? "",
    category: a.categories[0]?.category ?? null,
    author: { name: a.author.name ?? "Unknown", initials: initialsOf(a.author.name) },
    date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", dateFormat) : "",
    readTime: `${Math.max(1, Math.round(JSON.stringify(a.body).split(/\s+/).length / WORDS_PER_MINUTE))} min read`,
  }))

  // The lead story only earns the large treatment on an unfiltered first page.
  const isPlainFirstPage = page === 1 && !query
  const [featured, ...rest] = isPlainFirstPage ? mapped : []
  const listed = isPlainFirstPage ? rest : mapped
  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="flex items-start gap-8">
      <div className="min-w-0 flex-1">
        <CategoryFilter categories={categories} active={categorySlug} query={query} />

        {query && (
          <p className="mb-4 text-sm text-gray-500">
            {total} result{total === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-gray-900">“{query}”</span>
            {" · "}
            <Link href="/" className="font-medium text-brand hover:underline">
              Clear
            </Link>
          </p>
        )}

        {total === 0 &&
          (query || categorySlug ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matched"
              description={
                query
                  ? `No published article mentions “${query}”. Try a shorter phrase.`
                  : "This category has no published articles yet."
              }
              action={{ label: "Back to all news", href: "/" }}
            />
          ) : (
            <EmptyState
              icon={Newspaper}
              title="No news yet"
              description="Published articles will show up here as soon as an editor posts one."
              {...(can.manageContent(user)
                ? { action: { label: "Write the first article", href: "/admin/articles/new" } }
                : {})}
            />
          ))}

        {featured && (
          <Link href={`/articles/${featured.id}`} className="group mb-3 block">
            <article
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow
                group-hover:shadow-md"
            >
              <div className="h-1.5 w-full bg-brand" aria-hidden />
              <div className="p-6">
                {featured.category && (
                  <span
                    className="mb-3 inline-block rounded-full bg-brand px-2.5 py-1 text-xs font-semibold
                      text-white"
                  >
                    {featured.category.name}
                  </span>
                )}
                <h2
                  className="mb-2 text-2xl leading-snug font-bold text-gray-900 transition-colors
                    group-hover:text-brand"
                >
                  {featured.title}
                </h2>
                {featured.excerpt && (
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500">
                    {featured.excerpt}
                  </p>
                )}
                <Byline {...featured} />
              </div>
            </article>
          </Link>
        )}

        {listed.length > 0 && (
          <ul className="space-y-2">
            {listed.map((article) => (
              <li key={article.id}>
                <Link href={`/articles/${article.id}`} className="group block">
                  <article
                    className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4
                      transition group-hover:border-gray-300 group-hover:shadow-sm"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 w-1 shrink-0 self-stretch rounded-full bg-brand/40"
                    />
                    <div className="min-w-0 flex-1">
                      {article.category && (
                        <p className="mb-1 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                          {article.category.name}
                        </p>
                      )}
                      <h3
                        className="mb-1 line-clamp-2 text-sm leading-snug font-semibold text-gray-900
                          transition-colors group-hover:text-brand"
                      >
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="line-clamp-1 text-xs text-gray-400">{article.excerpt}</p>
                      )}
                    </div>
                    <div className="shrink-0 space-y-1 pt-0.5 text-right text-xs text-gray-400">
                      <p className="whitespace-nowrap">{article.date}</p>
                      <p className="whitespace-nowrap">{article.readTime}</p>
                    </div>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} params={params} />
        )}
      </div>

      <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
        {quickLinks.length > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Zap className="size-4 text-brand" aria-hidden />
              Quick links
            </h2>
            <ul className="space-y-0.5">
              {quickLinks.map((link) => {
                const external = !link.url.startsWith("/")
                return (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600
                        transition hover:bg-gray-50 hover:text-brand"
                    >
                      <span className="truncate">{link.label}</span>
                      {external && (
                        <ExternalLink
                          className="ml-auto size-3 shrink-0 text-gray-300 transition group-hover:text-brand"
                          aria-hidden
                        />
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {categories.length > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Browse by topic</h2>
            <ul className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.slug}`}
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      categorySlug === cat.slug
                        ? "bg-brand text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CalendarDays className="size-4 text-brand" aria-hidden />
            Upcoming events
          </h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-gray-400">No upcoming events.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingEvents.map((ev) => {
                const date = new Date(ev.eventDate!)
                return (
                  <li key={ev.id}>
                    <Link
                      href={`/articles/${ev.id}`}
                      className="group block rounded-lg p-2 transition hover:bg-gray-50"
                    >
                      <p className="text-[11px] font-semibold text-brand">
                        {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" · "}
                        {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium text-gray-700 group-hover:text-brand transition">
                        {ev.title}
                      </p>
                      {ev.eventLocation && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                          <MapPin className="size-2.5 shrink-0" aria-hidden />
                          {ev.eventLocation}
                        </p>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            href="/events"
            className="mt-3 block text-center text-xs font-medium text-brand hover:underline"
          >
            View full calendar →
          </Link>
        </section>

        {can.manageContent(user) && quickLinks.length === 0 && (
          <p className="px-1 text-xs leading-relaxed text-gray-400">
            Add sidebar shortcuts under{" "}
            <Link href="/admin/navigation" className="font-medium text-brand hover:underline">
              Navigation
            </Link>
            .
          </p>
        )}
      </aside>
    </div>
  )
}

function Byline({
  author,
  date,
  readTime,
}: {
  author: { name: string; initials: string }
  date: string
  readTime: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-gray-100 text-[10px]
          font-bold text-gray-600"
      >
        {author.initials}
      </span>
      <span className="font-medium text-gray-600">{author.name}</span>
      <span aria-hidden>·</span>
      <span>{date}</span>
      <span aria-hidden>·</span>
      <span>{readTime}</span>
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number
  totalPages: number
  params: { category?: string; q?: string }
}) {
  const href = (n: number) => {
    const search = new URLSearchParams()
    if (params.category) search.set("category", params.category)
    if (params.q) search.set("q", params.q)
    if (n > 1) search.set("page", String(n))
    const qs = search.toString()
    return qs ? `/?${qs}` : "/"
  }

  const base =
    "rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium transition " +
    "hover:border-gray-300 hover:bg-gray-50"

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${base} text-gray-700`} rel="prev">
          ← Newer
        </Link>
      ) : (
        <span className={`${base} cursor-not-allowed text-gray-300`} aria-disabled>
          ← Newer
        </span>
      )}

      <span className="text-xs text-gray-400">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={`${base} text-gray-700`} rel="next">
          Older →
        </Link>
      ) : (
        <span className={`${base} cursor-not-allowed text-gray-300`} aria-disabled>
          Older →
        </span>
      )}
    </nav>
  )
}
