"use client"

import { useEffect, useState } from "react"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { PollCard } from "@/components/poll-card"
import type { PollCardPoll, PollOption } from "@/components/poll-card"
import { getPollForEmbed } from "@/lib/actions/polls"
import { BarChart2, X } from "lucide-react"

type EmbedData =
  | { poll: PollCardPoll; options: PollOption[]; totalVotes: number; votedOptionIds: string[] }
  | { disabled: true }

export function PollEmbedView({ node, deleteNode, editor }: NodeViewProps) {
  const pollId = node.attrs.pollId as string
  const [data, setData] = useState<EmbedData | null>(null)
  // Tracked by id, not a plain boolean, so switching pollId (undo/redo can remap
  // this NodeView to a different poll in place) is immediately reflected as
  // "loading" without an effect needing to set it — and a stale fetch for a
  // now-abandoned id can't clobber the current one, since it can only ever
  // resolve to its own id.
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const loading = !!pollId && pollId !== resolvedId
  const editable = editor.isEditable

  useEffect(() => {
    if (!pollId) return
    let cancelled = false
    getPollForEmbed(pollId)
      .then((d) => {
        if (cancelled) return
        setData(d)
        setResolvedId(pollId)
      })
      .catch(() => {
        if (cancelled) return
        setData(null)
        setResolvedId(pollId)
      })
    return () => { cancelled = true }
  }, [pollId])

  if (!pollId) {
    return (
      <NodeViewWrapper>
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-400">
          Invalid poll embed.
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <div className="not-prose relative my-4 w-full">
        {editable && (
          <button
            type="button"
            onClick={deleteNode}
            className="absolute -top-2 -right-2 z-10 grid size-5 place-items-center rounded-full
              bg-gray-700 text-white hover:bg-red-600 transition"
            title="Remove poll"
          >
            <X className="size-3" />
          </button>
        )}
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-800">
            <BarChart2 className="size-4 animate-pulse text-brand" />
            Loading poll...
          </div>
        ) : data === null ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-400">
            Poll not found.
          </div>
        ) : "disabled" in data ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-400 dark:border-gray-700">
            <BarChart2 className="mb-1 size-4" />
            Polls module is disabled.
          </div>
        ) : (
          <PollCard
            poll={data.poll}
            options={data.options}
            totalVotes={data.totalVotes}
            initialVotedOptionIds={data.votedOptionIds}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
