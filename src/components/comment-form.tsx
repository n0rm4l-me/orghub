"use client"

import { useRef, useState, useEffect } from "react"
import { X } from "lucide-react"
import { useAction } from "@/lib/use-action"
import { addComment } from "@/lib/actions/comments"

interface Props {
  articleId: string
  parentId?: string
  replyingTo?: string
  onCancel?: () => void
  onSuccess?: () => void
}

export function CommentForm({ articleId, parentId, replyingTo, onCancel, onSuccess }: Props) {
  const [body, setBody] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus()
  }, [replyingTo])

  const { run, pending } = useAction(
    addComment.bind(null, articleId, body, parentId),
    {
      onSuccess: () => {
        setBody("")
        onSuccess?.()
      },
    },
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    run()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {replyingTo && (
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
            Replying to {replyingTo}
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Cancel reply"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={replyingTo ? `Reply to ${replyingTo}…` : "Write a comment…"}
        rows={replyingTo ? 2 : 3}
        maxLength={2000}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm
          text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2
          focus:ring-brand/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100
          dark:placeholder:text-gray-500"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{body.length}/2000</span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:text-gray-800
                dark:hover:text-gray-200"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition
              hover:bg-brand/90 disabled:opacity-40"
          >
            {pending ? "Posting…" : replyingTo ? "Post reply" : "Post comment"}
          </button>
        </div>
      </div>
    </form>
  )
}
