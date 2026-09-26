"use client"

import { NodeViewWrapper } from "@tiptap/react"
import { useState } from "react"
import { ImageOff } from "lucide-react"

export function ImageNodeView({
  node,
}: {
  node: { attrs: { src?: string; alt?: string; title?: string; width?: number | null; height?: number | null } }
}) {
  const [broken, setBroken] = useState(false)
  const { src, alt, title, width, height } = node.attrs

  return (
    <NodeViewWrapper>
      {broken ? (
        <div className="my-2 flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          <ImageOff className="size-4 shrink-0" />
          Media not found
        </div>
      ) : (
        <img
          src={src}
          alt={alt ?? ""}
          title={title ?? ""}
          width={width ?? undefined}
          height={height ?? undefined}
          onError={() => setBroken(true)}
          className="max-w-full rounded-lg"
        />
      )}
    </NodeViewWrapper>
  )
}
