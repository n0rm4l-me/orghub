"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface Props {
  /** Asset for the brand-coloured header and the admin rail. */
  logoUrl: string | null
  /** Asset for white surfaces. See the note on tone below. */
  logoOnLightUrl?: string | null
  siteName: string
  /** Height of the reserved slot in pixels. The slot never changes size. */
  height?: number
  /** `light` for dark backgrounds (header, admin rail), `dark` for white ones. */
  tone?: "light" | "dark"
  className?: string
}

/**
 * Renders the tenant logo inside a slot of fixed height and reserved width.
 *
 * A remote logo has unknown intrinsic dimensions, so the naive `<img>` collapses
 * to zero width and then snaps open when the bytes arrive, dragging the whole
 * header with it. Here the slot is sized up front, a placeholder holds the space
 * while loading, and a broken URL degrades to the wordmark instead of showing
 * the browser's broken-image glyph.
 *
 * The two tones deliberately do not share an asset. A header logo is normally
 * knocked out to white, so reusing it on the sign-in card renders white on white:
 * a light surface with no asset of its own falls back to the lettermark, which is
 * legible whatever the brand colour turns out to be.
 */
export function BrandLogo({
  logoUrl,
  logoOnLightUrl,
  siteName,
  height = 28,
  tone = "light",
  className,
}: Props) {
  const src = tone === "light" ? logoUrl : (logoOnLightUrl ?? null)
  const [state, setState] = useState<"loading" | "loaded" | "failed">(
    src ? "loading" : "failed"
  )

  const initials = siteName.slice(0, 2).toUpperCase()

  if (!src || state === "failed") {
    return (
      <span className={cn("flex items-center gap-2.5", className)} style={{ height }}>
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center rounded-lg text-xs font-bold",
            tone === "light" ? "bg-white/15 text-white" : "bg-brand text-white"
          )}
          style={{ height, width: height }}
        >
          {initials}
        </span>
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight whitespace-nowrap",
            tone === "light" ? "text-white" : "text-gray-900"
          )}
        >
          {siteName}
        </span>
      </span>
    )
  }

  return (
    <span
      className={cn("relative flex shrink-0 items-center", className)}
      /* Minimum width keeps the slot from collapsing before the image decodes;
         the image itself is free to be wider. */
      style={{ height, minWidth: height * 2.5 }}
    >
      {state === "loading" && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-pulse rounded-md",
            tone === "light" ? "bg-white/20" : "bg-gray-200/70"
          )}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={siteName}
        /* Decode off the main thread so a large logo cannot block first paint. */
        decoding="async"
        className={cn(
          "w-auto max-w-[180px] object-contain object-left transition-opacity duration-200",
          state === "loaded" ? "opacity-100" : "opacity-0"
        )}
        style={{ height }}
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
      />
    </span>
  )
}
