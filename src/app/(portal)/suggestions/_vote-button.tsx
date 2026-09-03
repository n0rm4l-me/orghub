"use client"

import { useState, useTransition } from "react"
import { ChevronUp } from "lucide-react"
import { toggleVote } from "@/lib/actions/suggestions"

interface Props {
  suggestionId: string
  initialCount: number
  initialVoted: boolean
  loggedIn: boolean
}

export function VoteButton({ suggestionId, initialCount, initialVoted, loggedIn }: Props) {
  const [voted, setVoted]   = useState(initialVoted)
  const [count, setCount]   = useState(initialCount)
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!loggedIn) return
    const nextVoted = !voted
    setVoted(nextVoted)
    setCount((c) => c + (nextVoted ? 1 : -1))
    startTransition(async () => {
      const res = await toggleVote(suggestionId)
      if (res.ok) {
        setVoted(res.data.voted)
        setCount(res.data.count)
      } else {
        setVoted(voted)
        setCount(count)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={!loggedIn || pending}
      title={loggedIn ? (voted ? "Remove vote" : "Upvote") : "Sign in to vote"}
      className={`flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-center
        transition-colors w-[52px] ${
          voted
            ? "border-brand bg-brand/10 text-brand"
            : "border-gray-200 text-gray-500 hover:border-brand/40 hover:text-brand dark:border-gray-700 dark:text-gray-400"
        } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <ChevronUp className="size-4" aria-hidden />
      <span className="tabular-nums text-sm font-semibold leading-none">{count}</span>
    </button>
  )
}
