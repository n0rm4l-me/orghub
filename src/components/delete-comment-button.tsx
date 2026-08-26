"use client"

import { Trash2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import { deleteComment } from "@/lib/actions/comments"

export function DeleteCommentButton({ id }: { id: string }) {
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
