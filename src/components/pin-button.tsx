"use client"

import { useState } from "react"
import { Pin, Loader2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  initialPinned: boolean
  onPin: () => Promise<ActionResult>
}

export function PinButton({ initialPinned, onPin }: Props) {
  const [pinned, setPinned] = useState(initialPinned)
  const { run, pending } = useAction(onPin, {
    onSuccess: () => setPinned((v) => !v),
  })

  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={pending}
      title={pinned ? "Unpin from feed" : "Pin as featured"}
      className={`transition-colors disabled:opacity-40 ${
        pinned ? "text-brand" : "text-gray-300 hover:text-gray-500"
      }`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Pin className={`size-4 ${pinned ? "fill-brand/20" : ""}`} aria-hidden />
      )}
    </button>
  )
}
