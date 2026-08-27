"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, Loader2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  initialBookmarkned: boolean
  onBookmark: () => Promise<ActionResult>
  compact?: boolean
  className?: string
}

export function BookmarkButton({ initialBookmarkned, onBookmark, compact, className }: Props) {
  const [pinned, setBookmarkned] = useState(initialBookmarkned)
  const router = useRouter()
  const { run, pending } = useAction(onBookmark, {
    onSuccess: () => {
      setBookmarkned((v) => !v)
      router.refresh()
    },
  })

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => run()}
        disabled={pending}
        title={pinned ? "Unpin from feed" : "Bookmark as featured"}
        className={`inline-flex items-center justify-center rounded p-0.5 transition-all disabled:opacity-40 ${
          pinned
            ? "text-brand"
            : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-400"
        }`}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <Bookmark className={`size-3 ${pinned ? "fill-brand/20" : ""}`} aria-hidden />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={pending}
      title={pinned ? "Unpin from feed" : "Bookmark as featured"}
      className={`transition-colors disabled:opacity-40 ${
        pinned ? "text-brand" : "text-gray-300 hover:text-gray-500"
      } ${className ?? ""}`}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Bookmark className={`size-3.5 ${pinned ? "fill-brand/20" : ""}`} aria-hidden />
      )}
    </button>
  )
}
