import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Link from "@tiptap/extension-link"
import { PollEmbedEditor } from "@/components/poll-embed-editor-extension"
import { ImageEmbedEditor } from "@/components/image-embed-editor-extension"

/**
 * What the admin editor actually mounts: the same document shape as
 * SCHEMA_EXTENSIONS (schema-extensions.ts), plus each embed's live NodeView
 * (a broken-image placeholder for ImageEmbed, the actual fetch-and-vote UI
 * with a remove button for PollEmbed). Deliberately its own file, not
 * SCHEMA_EXTENSIONS plus a couple of swapped-in entries in the same module:
 * see the comment in schema-extensions.ts for why that silently defeats the
 * server-side renderer's whole reason for existing. Only
 * editor.tsx/content-form.tsx should import this.
 */
export const EDITOR_EXTENSIONS = [
  StarterKit.configure({ link: false, underline: false }),
  Underline,
  Highlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  ImageEmbedEditor,
  Link.configure({ openOnClick: false }),
  PollEmbedEditor,
]
