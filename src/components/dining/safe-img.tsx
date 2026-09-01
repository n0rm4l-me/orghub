"use client"

import { useState, useEffect, useRef } from "react"
import { ImageOff } from "lucide-react"

interface Props {
  src: string | null | undefined
  alt: string
  className?: string
  /** Extra classes for the placeholder div. Defaults to `className`. */
  placeholderClassName?: string
}

export function SafeImg({ src, alt, className, placeholderClassName }: Props) {
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setFailed(false)
    // Image may have already failed before React hydrated and attached onError.
    // After mount/src-change, check the img element directly.
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
      setFailed(true)
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
      onError={() => setFailed(true)}
    />
  )
}
