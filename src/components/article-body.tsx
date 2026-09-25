"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import { EDITOR_EXTENSIONS } from "@/components/editor"

const PROSE =
  "prose prose-gray max-w-none dark:prose-invert " +
  "prose-headings:font-bold prose-headings:text-foreground " +
  "prose-p:text-foreground prose-p:leading-relaxed " +
  "prose-li:text-foreground " +
  "prose-strong:text-foreground " +
  "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"

export function ArticleBody({ body }: { body: unknown }) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
    content: (body as Parameters<typeof useEditor>[0]["content"]) ?? { type: "doc", content: [] },
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "outline-none" },
      handleDOMEvents: {
        // blur immediately after focus to prevent Tiptap's focus state
        // from causing the article container to grow by ~20px
        focus: (view) => {
          requestAnimationFrame(() => { view.dom.blur() })
          return false
        },
      },
    },
  })

  return (
    <div className={PROSE}>
      {editor && <EditorContent editor={editor} />}
    </div>
  )
}
