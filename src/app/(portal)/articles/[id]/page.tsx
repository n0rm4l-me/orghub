import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { gravatarUrl } from "@/lib/gravatar"
import { ArticleTranslateBody } from "@/components/article-translate-body"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Eye, MapPin, MessageSquare } from "lucide-react"
import { SidebarBlocks, type ActivePollData } from "@/components/sidebar-blocks"
import { getCurrentUser, hasRole } from "@/lib/rbac"
import { LikeButton } from "@/components/like-button"
import { CommentForm } from "@/components/comment-form"
import { CommentThread } from "@/components/comment-thread"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { recordView } from "@/lib/views"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params

  const [article, user, settings, quickLinks, upcomingEvents, categories] = await Promise.all([
    db.article.findFirst({
      where: { id, published: true },
      select: {
        id: true,
        title: true,
        body: true,
        publishedAt: true,
        coverImage: true,
        eventDate: true,
        eventEndDate: true,
        eventLocation: true,
        commentsEnabled: true,
        author: { select: { name: true, email: true, avatarUrl: true } },
        categories: { include: { category: true } },
        _count: { select: { reactions: true, views: true, comments: true } },
        comments: {
          where: { parentId: null },
          select: {
            id: true,
            body: true,
            createdAt: true,
            articleId: true,
            author: { select: { id: true, name: true, email: true, avatarUrl: true } },
            replies: {
              select: {
                id: true,
                body: true,
                createdAt: true,
                author: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    }),
    getCurrentUser(),
    getSettings(),
    getQuickLinks(),
    getUpcomingEvents(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ])

  if (!article) notFound()

  if (user) {
    await recordView(article.id, user.id)
  }

  const liked = user
    ? !!(await db.articleReaction.findUnique({
        where: { articleId_userId: { articleId: article.id, userId: user.id } },
      }))
    : false

  const category = article.categories[0]?.category
  const initials = article.author.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  const eventStart = article.eventDate ? new Date(article.eventDate) : null
  const eventEnd = article.eventEndDate ? new Date(article.eventEndDate) : null
  const sameDay = eventStart && eventEnd && eventStart.toDateString() === eventEnd.toDateString()

  const articleLayout = settings.articleLayout ?? "sidebar-right"
  const enabled = parseModules(settings.enabledModules)
  const eventsEnabled = enabled.has("events")
  const translationEnabled = enabled.has("translation")
  const pollsEnabled = enabled.has("polls")
  const rightBlocks = settings.sidebarOrder?.split(",").filter(Boolean) ?? ["quickLinks", "browseByTopic", "upcomingEvents"]
  const leftBlocks  = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const showLeft  = articleLayout === "sidebar-left"  || articleLayout === "sidebar-both"
  const showRight = articleLayout === "sidebar-right" || articleLayout === "sidebar-both"

  const allBlocks = [...rightBlocks, ...leftBlocks]
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

  const canModerate = hasRole(user, "EDITOR")

  const content = (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to feed
        </Link>

        {category && (
          <span className="rounded-full border border-brand/30 px-2.5 py-1 text-xs font-semibold text-brand">
            {category.name}
          </span>
        )}
      </div>

      {article.coverImage && (
        <div className="mb-4 overflow-hidden rounded-2xl">
          <img src={article.coverImage} alt="" className="aspect-[21/9] w-full object-cover" />
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
        <ArticleTranslateBody
          articleId={id}
          title={article.title}
          bodyJson={article.body}
          enabledLanguages={translationEnabled ? settings.translationLanguages : undefined}
        >
          {eventStart && (
            <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-brand/5
              border border-brand/20 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 dark:bg-brand/10">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4 text-brand shrink-0" aria-hidden />
                <span className="font-medium text-brand">
                  {eventStart.toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
                {" · "}
                {eventStart.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                {eventEnd && sameDay && (
                  <> – {eventEnd.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
                )}
                {eventEnd && !sameDay && (
                  <> – {eventEnd.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                  {eventEnd.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
                )}
              </span>
              {article.eventLocation && (
                <span className="flex items-center gap-1.5 text-gray-500">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  {article.eventLocation}
                </span>
              )}
            </div>
          )}
        </ArticleTranslateBody>

        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              {(article.author.avatarUrl || settings.gravatarsEnabled) && (
                <AvatarImage src={article.author.avatarUrl ?? gravatarUrl(article.author.email, 36)} alt="" />
              )}
              <AvatarFallback className="bg-gray-100 text-gray-600 font-semibold text-sm dark:bg-gray-700 dark:text-gray-300">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{article.author.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Draft"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-gray-400">
              <Eye className="size-3.5" aria-hidden />
              {article._count.views}
            </span>
            <LikeButton
              articleId={article.id}
              initialCount={article._count.reactions}
              initialLiked={liked}
              isLoggedIn={!!user}
            />
          </div>
        </div>
      </div>

      {article.commentsEnabled && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
            <MessageSquare className="size-4 text-gray-400 dark:text-gray-500" aria-hidden />
            Comments
            {article._count.comments > 0 && (
              <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {article._count.comments}
              </span>
            )}
          </h2>

          {article.comments.length > 0 ? (
            <ul className="mb-6 space-y-5">
              {article.comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  userId={user?.id ?? null}
                  canModerate={canModerate}
                  gravatarsEnabled={!!settings.gravatarsEnabled}
                />
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">No comments yet.</p>
          )}

          {user ? (
            <CommentForm articleId={article.id} />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link href="/login" className="font-medium text-brand hover:underline">
                Sign in
              </Link>{" "}
              to leave a comment.
            </p>
          )}
        </div>
      )}
    </div>
  )

  if (!showLeft && !showRight) {
    return <>{content}</>
  }

  return (
    <div className="flex items-start gap-8">
      {showLeft && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <SidebarBlocks blocks={leftBlocks} eventsEnabled={eventsEnabled} quickLinks={quickLinks} categories={categories} upcomingEvents={upcomingEvents} activePoll={activePollData} />
        </aside>
      )}
      <div className="min-w-0 flex-1">{content}</div>

      {showRight && <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
        <SidebarBlocks blocks={rightBlocks} eventsEnabled={eventsEnabled} quickLinks={quickLinks} categories={categories} upcomingEvents={upcomingEvents} activePoll={activePollData} />
      </aside>}
    </div>
  )
}

