import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Link from "@tiptap/extension-link"
import { PollEmbed } from "@/components/poll-embed-extension"
import { ImageEmbed } from "@/components/image-embed-extension"

/**
 * The document shape only: every node/mark type an article or page body can
 * contain, with no editing affordances. Used by the server-side HTML
 * renderer (render-article-body.ts) to build a schema, and by anything else
 * that only needs to know what's in a body, not how to edit it.
 *
 * Deliberately its own file, not just a second export alongside
 * EDITOR_EXTENSIONS in editor-extensions.ts: a JS/TS module's imports are
 * evaluated for the whole file, not per export, so if this list and the
 * editor's list (which needs `@tiptap/react` and each embed's NodeView
 * component) lived in the same file, importing *either* export would still
 * pull in *both* sets of imports. That defeated the point of this file the
 * first time it was written this way, silently, since nothing errors: the
 * public read path's client-reference-manifest kept listing
 * image-node-view.tsx/poll-embed-view.tsx (and so, transitively,
 * @tiptap/react and the rest of ProseMirror) even after ImageEmbed/PollEmbed
 * themselves were split into schema-only versions, purely because
 * SCHEMA_EXTENSIONS and EDITOR_EXTENSIONS were still sitting in the same
 * file as each other. Confirmed by grepping the built .next/static/chunks
 * for "prosemirror" and cross-referencing which routes' manifests
 * referenced them, before and after this file was split out.
 */
export const SCHEMA_EXTENSIONS = [
  StarterKit.configure({ link: false, underline: false }),
  Underline,
  Highlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  ImageEmbed,
  Link.configure({ openOnClick: false }),
  PollEmbed,
]
