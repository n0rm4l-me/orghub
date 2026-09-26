import { ReactNodeViewRenderer } from "@tiptap/react"
import { PollEmbed } from "@/components/poll-embed-extension"
import { PollEmbedView } from "@/components/poll-embed-view"

/** The editor-only version of PollEmbed: adds the live NodeView (fetches and
 *  renders the actual poll, with a remove button) on top of the shared
 *  schema. Only EDITOR_EXTENSIONS (the admin editor) should import this. */
export const PollEmbedEditor = PollEmbed.extend({
  addNodeView() {
    return ReactNodeViewRenderer(PollEmbedView)
  },
})
