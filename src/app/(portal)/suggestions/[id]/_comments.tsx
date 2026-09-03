"use client"

import { Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAction } from "@/lib/use-action"
import { deleteComment } from "@/lib/actions/suggestions"
import { gravatarUrl } from "@/lib/gravatar"

type CommentAuthor = {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

type Comment = {
  id: string
  body: string
  isAdminReply: boolean
  createdAt: Date
  authorId: string | null
  author: CommentAuthor | null
}

interface Props {
  comments: Comment[]
  currentUserId: string | null
  isAdmin: boolean
  gravatarsEnabled: boolean
}

function initials(name: string | null): string {
  return (name ?? "?")
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function DeleteBtn({ id }: { id: string }) {
  const { run, pending } = useAction(deleteComment.bind(null, id))
  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={pending}
      aria-label="Delete comment"
      className="rounded p-1 text-gray-300 transition hover:text-red-400 disabled:opacity-40"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  )
}

export function SuggestionCommentList({ comments, currentUserId, isAdmin, gravatarsEnabled }: Props) {
  if (comments.length === 0) return null

  return (
    <ul className="space-y-5">
      {comments.map((c) => {
        const canDelete = isAdmin || c.authorId === currentUserId
        const author = c.author
        return (
          <li key={c.id} className="flex gap-3">
            <Avatar className="size-8 shrink-0">
              {(author?.avatarUrl || gravatarsEnabled) && author && (
                <AvatarImage
                  src={author.avatarUrl ?? gravatarUrl(author.email, 32)}
                  alt=""
                />
              )}
              <AvatarFallback className="bg-gray-100 text-[11px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {initials(author?.name ?? null)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {author?.name ?? "Deleted user"}
                </span>
                {c.isAdminReply && (
                  <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    Admin
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">{fmt(c.createdAt)}</span>
                {canDelete && <DeleteBtn id={c.id} />}
              </div>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
                {c.body}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
