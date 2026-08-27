"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Loader2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  initialImportant: boolean
  onMark: () => Promise<ActionResult>
  compact?: boolean
  className?: string
}

export function ImportantButton({ initialImportant, onMark, compact, className }: Props) {
  const [important, setImportant] = useState(initialImportant)
  const router = useRouter()
  const { run, pending } = useAction(onMark, {
    onSuccess: () => {
      setImportant((v) => !v)
      router.refresh()
    },
  })

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => run()}
        disabled={pending}
        title={important ? "Remove important flag" : "Mark as important"}
        className={`inline-flex items-center justify-center rounded p-0.5 transition-all disabled:opacity-40 ${
          important
            ? "text-amber-500"
            : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-gray-400"
        }`}
      >
        {pending ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <Star className={`size-3 ${important ? "fill-amber-100" : ""}`} aria-hidden />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={pending}
      title={important ? "Remove important flag" : "Mark as important"}
      className={`transition-colors disabled:opacity-40 ${
        important ? "text-amber-500" : "text-gray-300 hover:text-gray-500"
      } ${className ?? ""}`}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Star className={`size-3.5 ${important ? "fill-amber-100" : ""}`} aria-hidden />
      )}
    </button>
  )
}
