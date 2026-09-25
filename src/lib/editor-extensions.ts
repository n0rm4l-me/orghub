import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Link from "@tiptap/extension-link"
import { PollEmbed } from "@/components/poll-embed-extension"
import { ImageEmbed } from "@/components/image-embed-extension"

/**
 * Shared by the admin editor and the read-only article renderer, so it lives
 * outside editor.tsx: importing it from there would drag the admin toolbar,
 * its icons, and its media/poll-insert actions into every public page that
 * renders an article body.
 */
export const EDITOR_EXTENSIONS = [
  StarterKit.configure({ link: false, underline: false }),
  Underline,
  Highlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  ImageEmbed,
  Link.configure({ openOnClick: false }),
  PollEmbed,
]
