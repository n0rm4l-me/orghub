import { notFound } from "next/navigation"
import { after } from "next/server"
import { db } from "@/lib/db"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { gravatarUrl } from "@/lib/gravatar"
import { ArticleTranslateBody } from "@/components/article-translate-body"
import { renderArticleBodyHtml } from "@/lib/render-article-body"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Eye, MapPin, MessageSquare } from "lucide-react"
import { getCurrentUser, hasRole } from "@/lib/rbac"
import { LikeButton } from "@/components/like-button"
import { CommentForm } from "@/components/comment-form"
import { CommentThread } from "@/components/comment-thread"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { recordView } from "@/lib/views"
import { PortalPageLayout } from "@/components/portal-page-layout"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params

  const [article, user, settings] = await Promise.all([
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
  ])

  if (!article) notFound()

  if (user) {
    after(() => recordView(article.id, user.id))
  }

  const articleLayout = settings.articleLayout ?? "sidebar-right"
  const enabled = parseModules(settings.enabledModules)
  const eventsEnabled = enabled.has("events")
  const translationEnabled = enabled.has("translation")
  const pollsEnabled = enabled.has("polls")
  const kudosEnabled = enabled.has("kudos")

  const likedReaction = user
    ? await db.articleReaction.findUnique({
        where: { articleId_userId: { articleId: article.id, userId: user.id } },
      })
    : null
  const liked = !!likedReaction

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

  const canModerate = hasRole(user, "EDITOR")

  const content = (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
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
        <div className="mb-4 overflow-hidden rounded-xl">
          <img
            src={`${article.coverImage}?w=800`}
            srcSet={`${article.coverImage}?w=480 480w, ${article.coverImage}?w=800 800w`}
            sizes="(min-width: 1024px) 700px, 100vw"
            alt=""
            className="aspect-[21/9] w-full object-cover"
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-8">
        <ArticleTranslateBody
          articleId={id}
          title={article.title}
          bodyHtml={renderArticleBodyHtml(article.body)}
          enabledLanguages={translationEnabled ? settings.translationLanguages : undefined}
        >
          {eventStart && (
            <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-brand/5
              border border-brand/20 px-4 py-3 text-sm text-foreground dark:bg-brand/10">
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
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  {article.eventLocation}
                </span>
              )}
            </div>
          )}
        </ArticleTranslateBody>

        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              {(article.author.avatarUrl || settings.gravatarsEnabled) && (
                <AvatarImage src={article.author.avatarUrl ?? gravatarUrl(article.author.email, 36)} alt="" />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{article.author.name}</p>
              <p className="text-xs text-muted-foreground">
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
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground">
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
        <div className="mt-4 rounded-xl border border-border bg-card p-8">
          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground">
            <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
            Comments
            {article._count.comments > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
            <p className="mb-6 text-sm text-muted-foreground">No comments yet.</p>
          )}

          {user ? (
            <CommentForm articleId={article.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
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

  return (
    <PortalPageLayout
      layout={articleLayout}
      sidebarOrder={settings.sidebarOrder}
      leftSidebarOrder={settings.leftSidebarOrder}
      eventsEnabled={eventsEnabled}
      pollsEnabled={pollsEnabled}
      kudosEnabled={kudosEnabled}
      gravatarsEnabled={settings.gravatarsEnabled}
    >
      {content}
    </PortalPageLayout>
  )
}

