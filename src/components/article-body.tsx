"use client"

import { generateHTML } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import { useMemo } from "react"

interface Props {
  body: unknown
}

export function ArticleBody({ body }: Props) {
  const html = useMemo(() => {
    try {
      return generateHTML(body as Parameters<typeof generateHTML>[0], [StarterKit])
    } catch {
      return "<p>Unable to render content.</p>"
    }
  }, [body])

  return (
    <div
      className="prose prose-gray max-w-none
        prose-headings:font-bold prose-headings:text-gray-900
        prose-p:text-gray-700 prose-p:leading-relaxed
        prose-li:text-gray-700
        prose-strong:text-gray-900
        prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
