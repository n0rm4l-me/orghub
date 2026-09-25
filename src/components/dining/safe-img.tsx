"use client"

import { useState, useEffect, useRef } from "react"
import { ImageOff } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
  src: string | null | undefined
  alt: string
  className?: string
  /** Extra classes for the placeholder div. Defaults to `className`. */
  placeholderClassName?: string
  width?: number
  height?: number
  loading?: "lazy" | "eager"
}

export function SafeImg({ src, alt, className, placeholderClassName, width, height, loading }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const failed = !!src && failedSrc === src
  const loaded = !!src && loadedSrc === src
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // Image may have already resolved (loaded or failed) before React hydrated
    // and attached onLoad/onError.
    if (imgRef.current?.complete && src) {
      if (imgRef.current.naturalWidth === 0) {
        setFailedSrc(src)
      } else {
        setLoadedSrc(src)
      }
    }
  }, [src])

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${placeholderClassName ?? className ?? ""}`}>
        <ImageOff className="size-4" aria-hidden />
      </div>
    )
  }

  return (
    <>
      {/* Shown until onLoad fires, so photos don't pop in abruptly once downloaded. */}
      {!loaded && <Skeleton className={placeholderClassName ?? className} />}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className ?? ""} ${loaded ? "" : "hidden"}`}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setLoadedSrc(src ?? null)}
        onError={() => setFailedSrc(src ?? null)}
      />
    </>
  )
}
