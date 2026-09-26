import Image from "@tiptap/extension-image"

// Schema-only: no addNodeView here on purpose. This extension is shared by
// the admin editor (via EDITOR_EXTENSIONS, see editor-extensions.ts) *and*
// the server-side HTML renderer (render-article-body.ts, via
// SCHEMA_EXTENSIONS), which only needs to know this node's shape
// (renderHTML/parseHTML, both already on the base Image extension) to
// build a schema, never how to interactively edit it. A NodeView needs a
// live client-side Editor to mount into and pulls in @tiptap/react plus a
// whole component; image-embed-editor-extension.ts adds that back for the
// editor's own extension list only, so this file (and everything that
// imports it) stays free of that import.
export const ImageEmbed = Image
