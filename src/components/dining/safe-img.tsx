"use client"

import { useState, useEffect, useRef } from "react"
import { ImageOff } from "lucide-react"

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
  const failed = !!src && failedSrc === src
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // Image may have already failed before React hydrated and attached onError.
    if (imgRef.current?.complete && imgRef.current?.naturalWidth === 0 && src) {
      setFailedSrc(src)
    }
  }, [src])

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 ${placeholderClassName ?? className ?? ""}`}>
        <ImageOff className="size-4" aria-hidden />
      </div>
    )
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      onError={() => setFailedSrc(src ?? null)}
    />
  )
}
