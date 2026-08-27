"use client"

import { useState, useTransition } from "react"
import { BarChart2, CheckCircle2, Clock, Eye, Lock, ShieldCheck } from "lucide-react"
import { castVote } from "@/lib/actions/polls"

export interface PollOption {
  id: string
  text: string
  voteCount: number
}

export interface PollCardPoll {
  id: string
  question: string
  anonymous: boolean
  multiChoice: boolean
  resultsVisibility: "ALWAYS" | "AFTER_VOTE" | "AFTER_CLOSE" | "NEVER"
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  endsAt: Date | null
}

interface Props {
  poll: PollCardPoll
  options: PollOption[]
  totalVotes: number
  initialVotedOptionIds: string[]
  compact?: boolean
}

export function PollCard({ poll, options, totalVotes, initialVotedOptionIds, compact = false }: Props) {
  const [voted, setVoted] = useState(initialVotedOptionIds.length > 0)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set(initialVotedOptionIds))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(
    Object.fromEntries(options.map((o) => [o.id, o.voteCount]))
  )
  const [localTotal, setLocalTotal] = useState(totalVotes)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const isClosed = poll.status === "CLOSED" || (poll.endsAt !== null && new Date(poll.endsAt) < new Date())
  const canVote = !voted && poll.status === "ACTIVE" && !isClosed

  const shouldShowResults =
    voted ||
    isClosed ||
    (poll.resultsVisibility === "ALWAYS" && !canVote) ||
    (poll.resultsVisibility === "AFTER_CLOSE" && isClosed)

  // When ALWAYS and user can still vote: show voting form + results preview below
  const showResultsPreview = canVote && poll.resultsVisibility === "ALWAYS"

  function toggleOption(id: string) {
    if (!canVote) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (poll.multiChoice) {
        next.has(id) ? next.delete(id) : next.add(id)
      } else {
        next.clear()
        next.add(id)
      }
      return next
    })
  }

  function handleVote() {
    if (!selected.size) return
    setError(null)
    startTransition(async () => {
      const result = await castVote(poll.id, [...selected])
      if (!result.ok) {
        setError(result.error)
        return
      }
      const newCounts = { ...localCounts }
      let added = 0
      selected.forEach((id) => {
        newCounts[id] = (newCounts[id] ?? 0) + 1
        added++
      })
      setLocalCounts(newCounts)
      setLocalTotal((t) => t + added)
      setVotedIds(selected)
      setVoted(true)
    })
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${compact ? "p-3" : "px-4 pb-4 pt-3"}`}>
      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        <BarChart2 className="size-3" aria-hidden />
        Poll
      </p>
      <h3 className={`font-semibold text-gray-900 dark:text-gray-100 ${compact ? "text-sm" : "text-base"}`}>
        {poll.question}
      </h3>

      <div className="mb-2.5 mt-1.5 flex flex-wrap items-center gap-1.5">
        {isClosed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Lock className="size-2.5" aria-hidden />
            Closed
          </span>
        ) : poll.status === "ACTIVE" && poll.endsAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
            <Clock className="size-2.5" aria-hidden />
            Ends {new Date(poll.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ) : null}

        {poll.anonymous ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <ShieldCheck className="size-3" aria-hidden />
            Anonymous
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Eye className="size-3" aria-hidden />
            Visible
          </span>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const count = localCounts[option.id] ?? 0
          const pct = localTotal > 0 ? Math.round((count / localTotal) * 100) : 0
          const isVotedOption = votedIds.has(option.id)
          const isSelected = selected.has(option.id)

          if (shouldShowResults) {
            return (
              <div
                key={option.id}
                className={`rounded-lg border px-3 py-2 ${
                  isVotedOption
                    ? "border-brand/30 bg-brand/5 dark:border-brand/20 dark:bg-brand/10"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className={`${compact ? "text-xs" : "text-sm"} text-gray-700 dark:text-gray-300 flex items-center gap-1.5`}>
                    {isVotedOption && <CheckCircle2 className="size-3.5 shrink-0 text-brand" aria-hidden />}
                    {option.text}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isVotedOption ? "bg-brand" : "bg-brand/40"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          }

          return (
            <button
              key={option.id}
              type="button"
              disabled={!canVote || pending}
              onClick={() => toggleOption(option.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition
                ${isSelected
                  ? "border-brand bg-brand/5 text-brand dark:border-brand dark:bg-brand/10"
                  : "border-gray-200 text-gray-700 hover:border-brand/50 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand/40 dark:hover:bg-gray-800"
                }
                disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="flex items-center gap-2">
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition ${isSelected ? "border-brand bg-brand" : "border-gray-300 dark:border-gray-600"}`}>
                  {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                {option.text}
              </span>
            </button>
          )
        })}
      </div>

      {showResultsPreview && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Current results</p>
          {options.map((option) => {
            const count = localCounts[option.id] ?? 0
            const pct = localTotal > 0 ? Math.round((count / localTotal) * 100) : 0
            return (
              <div key={option.id} className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{option.text}</span>
                  <span className="shrink-0 text-xs font-medium text-gray-500">{pct}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-full rounded-full bg-brand/40 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {canVote && (!shouldShowResults || showResultsPreview) ? (
        <button
          type="button"
          disabled={!selected.size || pending}
          onClick={handleVote}
          className="mt-4 w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white
            transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Submitting..." : poll.multiChoice ? "Submit votes" : "Vote"}
        </button>
      ) : voted ? (
        <div className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand/20 bg-brand/5 px-4 py-2 text-sm font-medium text-brand dark:border-brand/20 dark:bg-brand/10">
          <CheckCircle2 className="size-4" aria-hidden />
          Voted
        </div>
      ) : null}

      {poll.resultsVisibility === "NEVER" && !voted && !isClosed && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Results are not public.</p>
      )}
      {(poll.resultsVisibility === "AFTER_CLOSE" || poll.resultsVisibility === "NEVER") && !isClosed && voted && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Results visible after the poll closes.</p>
      )}

      <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
        {localTotal} vote{localTotal === 1 ? "" : "s"}
        {poll.multiChoice && " · Multi-choice"}
      </p>
    </div>
  )
}
