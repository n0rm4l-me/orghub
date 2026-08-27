"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pin, Loader2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  initialPinned: boolean
  onPin: () => Promise<ActionResult>
  compact?: boolean
  className?: string
}

export function PinButton({ initialPinned, onPin, compact, className }: Props) {
  const [pinned, setPinned] = useState(initialPinned)
  const router = useRouter()
  const { run, pending } = useAction(onPin, {
    onSuccess: () => {
      setPinned((v) => !v)
      router.refresh()
    },
  })

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => run()}
        disabled={pending}
        title={pinned ? "Unpin from feed" : "Pin as featured"}
        className={`inline-flex items-center justify-center rounded p-0.5 transition-all disabled:opacity-40 ${
          pinned
            ? "text-brand"
            : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-400"
        }`}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <Pin className={`size-3 ${pinned ? "fill-brand/20" : ""}`} aria-hidden />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={pending}
      title={pinned ? "Unpin from feed" : "Pin as featured"}
      className={`transition-colors disabled:opacity-40 ${
        pinned ? "text-brand" : "text-gray-300 hover:text-gray-500"
      } ${className ?? ""}`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Pin className={`size-4 ${pinned ? "fill-brand/20" : ""}`} aria-hidden />
      )}
    </button>
  )
}
