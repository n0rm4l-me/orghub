import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getCurrentUser } from "@/lib/rbac"
import { getSuggestionDetail } from "@/lib/actions/suggestions"
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/suggestion-constants"
import { PortalPageLayout } from "@/components/portal-page-layout"
import { VoteButton } from "../_vote-button"
import { SuggestionCommentList } from "./_comments"
import { SuggestionCommentForm } from "./_comment-form"

const DATE_FMT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function SuggestionDetailPage({ params }: Props) {
  const settings = await getSettings()
  const enabled  = parseModules(settings.enabledModules)
  if (!enabled.has("suggestions")) notFound()

  const { id } = await params
  const [suggestion, user] = await Promise.all([
    getSuggestionDetail(id),
    getCurrentUser(),
  ])

  if (!suggestion) notFound()

  const layout     = settings.suggestionsLayout ?? "content"
  const showSidebar = layout === "sidebar-right" || layout === "sidebar-left" || layout === "sidebar-both"
  const isAdmin    = user?.role === "ADMIN" || user?.role === "EDITOR"

  return (
    <PortalPageLayout
      layout={layout}
      sidebarOrder={settings.sidebarOrder}
      leftSidebarOrder={settings.leftSidebarOrder}
      eventsEnabled={enabled.has("events")}
      pollsEnabled={enabled.has("polls")}
      kudosEnabled={enabled.has("kudos")}
      gravatarsEnabled={settings.gravatarsEnabled}
    >
      <div className={showSidebar ? undefined : "mx-auto max-w-3xl"}>
        {/* Back */}
        <Link
          href="/suggestions"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to suggestions
        </Link>

        {/* Title row */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="shrink-0 pt-1">
            <VoteButton
              suggestionId={suggestion.id}
              initialCount={suggestion.voteCount}
              initialVoted={suggestion.voted}
              loggedIn={!!user}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{suggestion.title}</h1>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[suggestion.status]}`}>
                {STATUS_LABEL[suggestion.status]}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {suggestion.category && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {suggestion.category}
                </span>
              )}
              <span>{new Date(suggestion.createdAt).toLocaleDateString("en-US", DATE_FMT)}</span>
              <span>by {suggestion.author?.name ?? "Anonymous"}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm leading-relaxed
          text-foreground whitespace-pre-wrap">
          {suggestion.body}
        </div>

        {/* Admin note */}
        {suggestion.adminNote && (
          <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 px-4 py-3">
            <p className="text-xs font-medium text-brand">Admin note</p>
            <p className="mt-1 text-sm text-foreground">{suggestion.adminNote}</p>
          </div>
        )}

        {/* Comments */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-8">
          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-foreground">
            <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
            Comments
            {suggestion.comments.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {suggestion.comments.length}
              </span>
            )}
          </h2>

          {suggestion.comments.length > 0 ? (
            <div className="mb-6">
              <SuggestionCommentList
                comments={suggestion.comments}
                currentUserId={suggestion.currentUserId}
                isAdmin={!!isAdmin}
                gravatarsEnabled={settings.gravatarsEnabled}
              />
            </div>
          ) : (
            <p className="mb-6 text-sm text-muted-foreground">No comments yet.</p>
          )}

          {user ? (
            <SuggestionCommentForm suggestionId={suggestion.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link>{" "}
              to leave a comment.
            </p>
          )}
        </div>
      </div>
    </PortalPageLayout>
  )
}
