"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  initialEnabled: boolean
  onToggle: (next: boolean) => Promise<ActionResult>
  ariaLabel?: string
}

export function BooleanToggle({ initialEnabled, onToggle, ariaLabel }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const { run, pending } = useAction((v: boolean) => onToggle(v), {
    onSuccess: () => setEnabled((v) => !v),
  })

  return (
    <button
      type="button"
      onClick={() => run(!enabled)}
      disabled={pending}
      aria-pressed={enabled}
      aria-label={ariaLabel ?? (enabled ? "Disable" : "Enable")}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
        border-2 border-transparent transition-colors focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-60
        ${enabled ? "bg-brand" : "bg-gray-200"}`}
    >
      {pending ? (
        <Loader2 className="absolute left-1/2 size-3.5 -translate-x-1/2 animate-spin text-white" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={`inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform
            ${enabled ? "translate-x-5" : "translate-x-0"}`}
        />
      )}
    </button>
  )
}
