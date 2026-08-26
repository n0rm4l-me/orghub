"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Star, Loader2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  initialImportant: boolean
  onMark: () => Promise<ActionResult>
}

export function ImportantButton({ initialImportant, onMark }: Props) {
  const [important, setImportant] = useState(initialImportant)
  const router = useRouter()
  const { run, pending } = useAction(onMark, {
    onSuccess: () => {
      setImportant((v) => !v)
      router.refresh()
    },
  })

  return (
    <button
      type="button"
      onClick={() => run()}
      disabled={pending}
      title={important ? "Remove important flag" : "Mark as important"}
      className={`transition-colors disabled:opacity-40 ${
        important ? "text-amber-500" : "text-gray-300 hover:text-gray-500"
      }`}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Star className={`size-4 ${important ? "fill-amber-100" : ""}`} aria-hidden />
      )}
    </button>
  )
}
