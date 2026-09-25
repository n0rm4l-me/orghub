"use client"

import { useState } from "react"
import { addComment } from "@/lib/actions/suggestions"
import { useAction } from "@/lib/use-action"
import { useRouter } from "next/navigation"

export function SuggestionCommentForm({ suggestionId }: { suggestionId: string }) {
  const [body, setBody] = useState("")
  const router = useRouter()

  const { run, pending } = useAction(addComment.bind(null, suggestionId, body), {
    onSuccess: () => {
      setBody("")
      router.refresh()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    run()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment…"
        rows={3}
        maxLength={2000}
        className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm
          text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2
          focus:ring-brand/20"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{body.length}/2000</span>
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
