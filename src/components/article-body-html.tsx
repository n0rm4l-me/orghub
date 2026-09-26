"use client"

import { useEffect, useRef } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PollEmbedContent } from "@/components/poll-embed-content"

const PROSE =
  "prose prose-gray max-w-none dark:prose-invert " +
  "prose-headings:font-bold prose-headings:text-foreground " +
  "prose-p:text-foreground prose-p:leading-relaxed " +
  "prose-li:text-foreground " +
  "prose-strong:text-foreground " +
  "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"

/**
 * Renders article/page body content that was already turned into static
 * HTML server-side (see render-article-body.ts), instead of loading a full
 * client-side Tiptap editor just to display read-only text.
 *
 * The one thing static HTML can't carry is PollEmbed's live voting UI, so
 * `renderArticleBodyHtml` leaves a `<div data-poll-id="...">` marker in its
 * place (PollEmbed's own `renderHTML`, unchanged), and this component finds
 * every one of those inside its container after mount and mounts a small,
 * separate React root directly onto it — an "island" of interactivity
 * inside content that's otherwise plain server-rendered markup. This is why
 * the container is a plain ref, not something React's own tree renders
 * into: these nodes come from `dangerouslySetInnerHTML`, outside anything
 * React is tracking, so `createRoot` (not a portal, which needs a target
 * already known during a render pass) is the correct tool to graft onto
 * them after the fact.
 */
export function ArticleBodyHtml({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const roots: Root[] = []
    const markers = container.querySelectorAll<HTMLElement>("[data-poll-id]")
    markers.forEach((marker) => {
      const pollId = marker.getAttribute("data-poll-id")
      if (!pollId) return
      const root = createRoot(marker)
      root.render(<PollEmbedContent pollId={pollId} />)
      roots.push(root)
    })

    return () => {
      // unmount() synchronously tears down each root's DOM; queued so React
      // doesn't warn about unmounting mid-render if this fires while a
      // parent is still committing.
      roots.forEach((root) => queueMicrotask(() => root.unmount()))
    }
  }, [html])

  return <div ref={containerRef} className={PROSE} dangerouslySetInnerHTML={{ __html: html }} />
}
