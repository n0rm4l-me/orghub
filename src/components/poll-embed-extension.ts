import { Node, mergeAttributes } from "@tiptap/core"

// Schema-only: no addNodeView here on purpose, same reasoning as
// image-embed-extension.ts. poll-embed-editor-extension.ts adds the live
// voting NodeView back for the admin editor's own extension list only.
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
})
