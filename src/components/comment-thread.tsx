"use client"

import { useState } from "react"
import { CornerDownRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DeleteCommentButton } from "@/components/delete-comment-button"
import { CommentForm } from "@/components/comment-form"
import { gravatarUrl } from "@/lib/gravatar"

type Reply = {
  id: string
  body: string
  createdAt: Date
  author: { id: string; name: string | null; email: string; avatarUrl: string | null }
}

type Comment = Reply & {
  articleId: string
  replies: Reply[]
}

interface Props {
  comment: Comment
  userId: string | null
  canModerate: boolean
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

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function ReplyItem({
  reply,
  userId,
  canModerate,
  gravatarsEnabled,
}: {
  reply: Reply
  userId: string | null
  canModerate: boolean
  gravatarsEnabled: boolean
}) {
  const canDelete = userId === reply.author.id || canModerate
  return (
    <li className="flex gap-2.5">
      <Avatar className="size-7 shrink-0">
        {(reply.author.avatarUrl || gravatarsEnabled) && (
          <AvatarImage src={reply.author.avatarUrl ?? gravatarUrl(reply.author.email, 28)} alt="" />
        )}
        <AvatarFallback className="bg-gray-100 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {initials(reply.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{reply.author.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(reply.createdAt)}</span>
          {canDelete && <DeleteCommentButton id={reply.id} />}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
          {reply.body}
        </p>
      </div>
    </li>
  )
}

export function CommentThread({ comment, userId, canModerate, gravatarsEnabled }: Props) {
  const [replying, setReplying] = useState(false)
  const COLLAPSE_THRESHOLD = 3
  const [showReplies, setShowReplies] = useState(comment.replies.length < COLLAPSE_THRESHOLD)

  const canDelete = userId === comment.author.id || canModerate
  const replyCount = comment.replies.length

  return (
    <li className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        {(comment.author.avatarUrl || gravatarsEnabled) && (
          <AvatarImage src={comment.author.avatarUrl ?? gravatarUrl(comment.author.email, 32)} alt="" />
        )}
        <AvatarFallback className="bg-gray-100 text-[11px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {initials(comment.author.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{comment.author.name}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(comment.createdAt)}</span>
          {canDelete && <DeleteCommentButton id={comment.id} />}
        </div>

        {/* Body */}
        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:text-gray-300">
          {comment.body}
        </p>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-3">
          {userId && (
            <button
              type="button"
              onClick={() => setReplying((r) => !r)}
              className="flex items-center gap-1 text-xs text-gray-400 transition hover:text-gray-700
                dark:hover:text-gray-300"
            >
              <CornerDownRight className="size-3" aria-hidden />
              Reply
            </button>
          )}
          {replyCount >= COLLAPSE_THRESHOLD && !showReplies && (
            <button
              type="button"
              onClick={() => setShowReplies(true)}
              className="text-xs font-medium text-brand hover:underline"
            >
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
          {replyCount >= COLLAPSE_THRESHOLD && showReplies && (
            <button
              type="button"
              onClick={() => setShowReplies(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Hide replies
            </button>
          )}
        </div>

        {/* Replies list */}
        {replyCount > 0 && showReplies && (
          <ul className="mt-3 space-y-3 border-l-2 border-gray-100 pl-4 dark:border-gray-800">
            {comment.replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                userId={userId}
                canModerate={canModerate}
                gravatarsEnabled={gravatarsEnabled}
              />
            ))}
          </ul>
        )}

        {/* Inline reply form */}
        {replying && (
          <div className="mt-3 border-l-2 border-brand/30 pl-4">
            <CommentForm
              articleId={comment.articleId}
              parentId={comment.id}
              replyingTo={comment.author.name ?? undefined}
              onCancel={() => setReplying(false)}
              onSuccess={() => {
                setReplying(false)
                setShowReplies(true)
              }}
            />
          </div>
        )}
      </div>
    </li>
  )
}
