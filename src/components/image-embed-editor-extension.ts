import { ReactNodeViewRenderer } from "@tiptap/react"
import { ImageEmbed } from "@/components/image-embed-extension"
import { ImageNodeView } from "@/components/image-node-view"

/** The editor-only version of ImageEmbed: adds the live "show a broken-image
 *  placeholder while editing" NodeView on top of the shared schema. Only
 *  EDITOR_EXTENSIONS (the admin editor) should import this; the server-side
 *  renderer and anything else that only needs the schema imports the plain
 *  ImageEmbed from image-embed-extension.ts instead. */
export const ImageEmbedEditor = ImageEmbed.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})
