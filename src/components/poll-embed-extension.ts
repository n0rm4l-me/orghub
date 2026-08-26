import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { PollEmbedView } from "@/components/poll-embed-view"

export const PollEmbed = Node.create({
  name: "pollEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      pollId: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-poll-id]", getAttrs: (el) => ({ pollId: (el as HTMLElement).getAttribute("data-poll-id") }) }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-poll-id": HTMLAttributes.pollId })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PollEmbedView)
  },
})
