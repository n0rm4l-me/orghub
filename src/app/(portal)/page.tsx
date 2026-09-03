import Link from "next/link"
import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { CalendarDays, Heart, Newspaper, Pin, SearchX, Star } from "lucide-react"
import { SidebarBlocks, type ActivePollData, type TopKudosEntry } from "@/components/sidebar-blocks"
import { getTopKudosRecipients } from "@/lib/actions/kudos"
import { CategoryFilter } from "@/components/category-filter"
import { EmptyState } from "@/components/ui/empty-state"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getCurrentUser, can } from "@/lib/rbac"
import { FeedSeenMarker } from "@/components/feed-seen-marker"

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

function Byline({ date, readTime }: { date: string; readTime: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>{date}</span>
      <span aria-hidden>·</span>
      <span>{readTime}</span>
    </div>
  )
}

type MappedArticle = {
  id: string
  title: string
  excerpt: string
  snippet: string
  category: { name: string; slug: string } | null
  author: { name: string; initials: string }
  date: string
  readTime: string
  eventDate: Date | null
  coverImage: string | null
  reactionCount: number
  liked: boolean
  important: boolean
  isNew: boolean
}

function FeaturedCard({
  article,
  pinned = false,
}: {
  article: MappedArticle
  pinned?: boolean
}) {
  return (
    <article className={`group mb-3 overflow-hidden rounded-2xl border transition-shadow hover:shadow-md ${article.important ? "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
      <Link href={`/articles/${article.id}`} className="block">
        {article.coverImage ? (
          <div className="relative h-48 overflow-hidden">
            <img src={`${article.coverImage}?w=800`} alt="" className="h-full w-full object-cover" loading="lazy" />
            <div
              className={`absolute inset-x-0 bottom-0 h-1.5 ${article.important ? "bg-amber-400/80" : "bg-brand/80"}`}
              aria-hidden
            />
          </div>
        ) : (
          <div
            className={`h-1.5 w-full ${article.important ? "bg-amber-400" : "bg-brand"}`}
            aria-hidden
          />
        )}
        <div className="p-6 pb-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {article.important && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 px-2.5 py-1 text-xs font-semibold text-amber-600">
                <Star className="size-3 fill-amber-400" aria-hidden />
                Important
              </span>
            )}
            {pinned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 px-2.5 py-1 text-xs font-semibold text-brand">
                <Pin className="size-3" aria-hidden />
                Pinned
              </span>
            )}
            {article.eventDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                <CalendarDays className="size-3" aria-hidden />
                Event
              </span>
            )}
            {article.category && (
              <span className="inline-block rounded-full border border-brand/30 px-2.5 py-1 text-xs font-semibold text-brand">
                {article.category.name}
              </span>
            )}
          </div>
          <h2 className="mb-2 text-2xl leading-snug font-bold text-gray-900 transition-colors group-hover:text-brand dark:text-gray-100">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {article.excerpt}
            </p>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between px-6 pb-4">
        <Byline {...article} />
        {article.reactionCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Heart className="size-3" aria-hidden />
            {article.reactionCount}
          </span>
        )}
      </div>
    </article>
  )
}

export default async function FeedPage({ searchParams }: Props) {
  const params = await searchParams
  const categorySlug = params.category?.trim() || undefined
  const query = params.q?.trim() || undefined
  const page = Math.max(1, Number(params.page) || 1)

  const isHomeFeed = page === 1 && !query && !categorySlug

  const baseWhere: Prisma.ArticleWhereInput = {
    published: true,
    // Exclude events from the unfiltered feed — they live on /events.
    // When browsing by category or searching, show all article types.
    ...(categorySlug || query ? {} : { eventDate: null }),
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
  // On the home feed exclude pinned from the regular list — they render above as hero cards.
  const listWhere: Prisma.ArticleWhereInput = isHomeFeed ? { ...baseWhere, pinned: false } : baseWhere

  const articleSelect = {
    id: true,
    slug: true,
    title: true,
    excerpt: true,
    wordCount: true,
    publishedAt: true,
    eventDate: true,
    eventLocation: true,
    coverImage: true,
    author: { select: { name: true } },
    categories: { select: { category: { select: { name: true, slug: true } } } },
    _count: { select: { reactions: true } },
    important: true,
  } as const

  const settings = await getSettings()
  const PER_PAGE = settings.feedPageSize ?? 15
  const pollsEnabled = parseModules(settings.enabledModules).has("polls")
  const kudosEnabled = parseModules(settings.enabledModules).has("kudos")

  const [articles, total, categories, quickLinks, upcomingEvents, user, pinnedRaw] =
    await Promise.all([
      db.article.findMany({
        where: listWhere,
        orderBy: { publishedAt: "desc" },
        select: articleSelect,
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      db.article.count({ where: listWhere }),
      db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
      getQuickLinks(),
      getUpcomingEvents(),
      getCurrentUser(),
      isHomeFeed
        ? db.article.findMany({
            where: { published: true, pinned: true, eventDate: null },
            orderBy: { publishedAt: "desc" },
            select: articleSelect,
            take: 3,
          })
        : Promise.resolve([]),
    ])

  const allArticleIds = [...articles.map((a) => a.id), ...pinnedRaw.map((a) => a.id)]
  let likedIds: Set<string> = new Set()
  let lastFeedVisitAt: Date | null = null

  if (user) {
    const [reactions, feedUser] = await Promise.all([
      db.articleReaction.findMany({
        where: { userId: user.id, articleId: { in: allArticleIds } },
        select: { articleId: true },
      }),
      db.user.findUnique({
        where: { id: user.id },
        select: { lastFeedVisitAt: true },
      }),
    ])
    likedIds = new Set(reactions.map((r) => r.articleId))
    lastFeedVisitAt = feedUser?.lastFeedVisitAt ?? null
  }

  function mapArticle(a: (typeof articles)[0]) {
    return {
      id: a.id,
      title: a.title,
      excerpt: a.excerpt ?? "",
      snippet: a.excerpt ?? "",
      category: a.categories[0]?.category ?? null,
      author: { name: a.author.name ?? "Unknown", initials: initialsOf(a.author.name) },
      date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", dateFormat) : "",
      readTime: `${Math.max(1, Math.round(a.wordCount / WORDS_PER_MINUTE))} min read`,
      eventDate: a.eventDate ?? null,
      coverImage: a.coverImage ?? null,
      reactionCount: a._count.reactions,
      liked: likedIds.has(a.id),
      important: a.important,
      isNew: lastFeedVisitAt !== null && a.publishedAt !== null && a.publishedAt > lastFeedVisitAt,
    }
  }

  const pinnedArticles = pinnedRaw.map(mapArticle)
  const listed = articles.map(mapArticle)

  // On a plain first page with no pinned articles fall back to first article as hero.
  const isPlainFirstPage = page === 1 && !query
  const fallbackFeatured =
    isPlainFirstPage && !categorySlug && pinnedArticles.length === 0 ? listed[0] : undefined
  const finalListed = fallbackFeatured ? listed.slice(1) : listed

  const totalPages = Math.ceil(total / PER_PAGE)
  const eventsEnabled = parseModules(settings.enabledModules).has("events")
  const feedLayout = settings.feedLayout ?? "sidebar-right"

  const allBlocks = [
    ...(settings.sidebarOrder?.split(",").filter(Boolean) ?? []),
    ...(settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []),
  ]
  let activePollData: ActivePollData | null = null
  if (pollsEnabled && allBlocks.includes("activePolls")) {
    const activePollRaw = await db.poll.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
        _count: { select: { votes: true } },
      },
    })
    if (activePollRaw) {
      const userVotes = user
        ? await db.pollVote.findMany({
            where: { pollId: activePollRaw.id, userId: user.id },
            select: { optionId: true },
          })
        : []
      activePollData = {
        poll: {
          id: activePollRaw.id,
          question: activePollRaw.question,
          anonymous: activePollRaw.anonymous,
          multiChoice: activePollRaw.multiChoice,
          resultsVisibility: activePollRaw.resultsVisibility,
          status: activePollRaw.status,
          endsAt: activePollRaw.endsAt,
        },
        options: activePollRaw.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes })),
        totalVotes: activePollRaw._count.votes,
        votedOptionIds: userVotes.map((v) => v.optionId),
      }
    }
  }
  let topKudosData: TopKudosEntry[] = []
  if (kudosEnabled && allBlocks.includes("topKudos")) {
    topKudosData = await getTopKudosRecipients(5)
  }

  const cardStyle = (settings.feedCardStyle ?? "preview") as "compact" | "default" | "preview"
  const rightBlocks = settings.sidebarOrder?.split(",").filter(Boolean) ?? ["quickLinks", "browseByTopic", "upcomingEvents"]
  const leftBlocks = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const showLeft  = feedLayout === "sidebar-left"  || feedLayout === "sidebar-both"
  const showRight = feedLayout === "sidebar-right" || feedLayout === "sidebar-both"

  return (
    <>
      <FeedSeenMarker />
      <CategoryFilter categories={categories} active={categorySlug} query={query} />
      <div className="flex items-start gap-8">
        {showLeft && (
          <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
            <SidebarBlocks
              blocks={leftBlocks}
              eventsEnabled={eventsEnabled}
              quickLinks={quickLinks}
              categories={categories}
              upcomingEvents={upcomingEvents}
              activeCategory={categorySlug}
              activePoll={activePollData}
              kudosEnabled={kudosEnabled}
              topKudos={topKudosData}
              gravatarsEnabled={settings.gravatarsEnabled}
            />
          </aside>
        )}
        <div className="min-w-0 flex-1">

        {query && (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {total} result{total === 1 ? "" : "s"} for{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">&quot;{query}&quot;</span>
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
                  ? `No published article mentions "${query}". Try a shorter phrase.`
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

        {isHomeFeed && pinnedArticles.map((a) => (
          <FeaturedCard key={a.id} article={a} pinned />
        ))}

        {fallbackFeatured && <FeaturedCard article={fallbackFeatured} />}

        {finalListed.length > 0 && (
          <ul className="space-y-2">
            {finalListed.map((article) => (
              <li key={article.id}>
                <article
                  className={`group overflow-hidden rounded-xl border transition hover:shadow-sm ${
                    article.important
                      ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:border-amber-800/60"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
                  }`}
                >
                  <Link
                    href={`/articles/${article.id}`}
                    className="flex min-w-0 items-center gap-3 px-4 pt-4 pb-3"
                  >
                    {cardStyle === "preview" && article.coverImage && (
                      <img
                        src={`${article.coverImage}?w=112`}
                        alt=""
                        className="size-14 shrink-0 rounded-md object-cover"
                        width={56}
                        height={56}
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        {article.isNew && (
                          <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            NEW
                          </span>
                        )}
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-brand dark:text-gray-100">
                          {article.title}
                        </h3>
                      </div>
                      {cardStyle === "preview" && article.snippet && (
                        <p className="line-clamp-1 text-xs text-gray-400">{article.snippet}</p>
                      )}
                      {cardStyle === "default" && article.excerpt && (
                        <p className="line-clamp-1 text-xs text-gray-400">{article.excerpt}</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 px-4 pb-3 text-[11px] text-gray-400 dark:text-gray-500">
                    {article.category && (
                      <span className="rounded-full border border-brand/30 px-2 py-0.5 font-medium text-brand">
                        {article.category.name}
                      </span>
                    )}
                    {article.important && (
                      <span className="rounded-full border border-amber-300/60 px-2 py-0.5 font-medium text-amber-600">
                        Important
                      </span>
                    )}
                    <span className="flex-1" />
                    <span>{article.date}</span>
                    <span aria-hidden className="text-gray-300">·</span>
                    <span>{article.readTime}</span>
                    {article.reactionCount > 0 && (
                      <>
                        <span aria-hidden className="text-gray-300">·</span>
                        <span className="flex items-center gap-1">
                          <Heart className="size-3" aria-hidden />
                          {article.reactionCount}
                        </span>
                      </>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} params={params} />
        )}

        {(showLeft || showRight) && (
          <section className="mt-6 space-y-4 lg:hidden">
            <SidebarBlocks
              blocks={[...leftBlocks, ...rightBlocks]}
              eventsEnabled={eventsEnabled}
              quickLinks={quickLinks}
              categories={categories}
              upcomingEvents={upcomingEvents}
              activeCategory={categorySlug}
              activePoll={activePollData}
              kudosEnabled={kudosEnabled}
              topKudos={topKudosData}
              gravatarsEnabled={settings.gravatarsEnabled}
            />
          </section>
        )}
      </div>

        {showRight && (
          <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
            {rightBlocks.length === 0 && can.manageContent(user) && (
              <p className="px-1 text-xs leading-relaxed text-gray-400">
                Add sidebar shortcuts under{" "}
                <Link href="/admin/navigation" className="font-medium text-brand hover:underline">
                  Navigation
                </Link>
                .
              </p>
            )}
            <SidebarBlocks
              blocks={rightBlocks}
              eventsEnabled={eventsEnabled}
              quickLinks={quickLinks}
              categories={categories}
              upcomingEvents={upcomingEvents}
              activeCategory={categorySlug}
              activePoll={activePollData}
              kudosEnabled={kudosEnabled}
              topKudos={topKudosData}
              gravatarsEnabled={settings.gravatarsEnabled}
            />
          </aside>
        )}
      </div>
    </>
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
    "hover:border-gray-300 hover:bg-gray-50 " +
    "dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800"

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${base} text-gray-700 dark:text-gray-300`} rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className={`${base} cursor-not-allowed text-gray-300`} aria-disabled>
          ← Previous
        </span>
      )}

      <span className="text-xs text-gray-400">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={`${base} text-gray-700 dark:text-gray-300`} rel="next">
          Next →
        </Link>
      ) : (
        <span className={`${base} cursor-not-allowed text-gray-300`} aria-disabled>
          Next →
        </span>
      )}
    </nav>
  )
}
