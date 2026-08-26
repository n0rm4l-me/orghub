"use client"

import { useRef, useState } from "react"
import { useAction } from "@/lib/use-action"
import { addComment } from "@/lib/actions/comments"

export function CommentForm({ articleId }: { articleId: string }) {
  const [body, setBody] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { run, pending } = useAction(addComment.bind(null, articleId, body), {
    onSuccess: () => setBody(""),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    run()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment…"
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base
          text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2
          focus:ring-brand/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{body.length}/2000</span>
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition
            hover:bg-brand/90 disabled:opacity-40"
        >
          {pending ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  )
}
