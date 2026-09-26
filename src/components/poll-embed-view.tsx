"use client"

import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { PollEmbedContent } from "@/components/poll-embed-content"

export function PollEmbedView({ node, deleteNode, editor }: NodeViewProps) {
  const pollId = node.attrs.pollId as string
  return (
    <NodeViewWrapper>
      <PollEmbedContent pollId={pollId} onRemove={editor.isEditable ? deleteNode : undefined} />
    </NodeViewWrapper>
  )
}
