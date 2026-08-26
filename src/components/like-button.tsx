"use client"

import { useRef, useState } from "react"
import { Heart } from "lucide-react"
import { useAction } from "@/lib/use-action"
import { toast } from "@/components/ui/toaster"
import { toggleReaction } from "@/lib/actions/reactions"

interface Props {
  articleId: string
  initialCount: number
  initialLiked: boolean
  isLoggedIn: boolean
}

export function LikeButton({ articleId, initialCount, initialLiked, isLoggedIn }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const prevRef = useRef({ liked: initialLiked, count: initialCount })

  const { run, pending } = useAction(toggleReaction.bind(null, articleId), {
    silent: true,
    onSuccess: (data) => {
      if (data) { setLiked(data.liked); setCount(data.count) }
    },
  })

  function handle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      toast.info("Sign in to react to articles.")
      return
    }

    prevRef.current = { liked, count }
    setLiked((v) => !v)
    setCount((c) => (liked ? c - 1 : c + 1))

    run()
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      aria-label={liked ? `Unlike (${count})` : `Like (${count})`}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium
        transition disabled:opacity-50 ${
          liked
            ? "bg-rose-50 text-rose-500 hover:bg-rose-100"
            : "text-gray-400 hover:bg-rose-50 hover:text-rose-400"
        }`}
    >
      <Heart className={`size-3.5 ${liked ? "fill-rose-500" : ""}`} aria-hidden />
      {count > 0 && (
        <span className="tabular-nums leading-none">
          {count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : count}
        </span>
      )}
    </button>
  )
}
