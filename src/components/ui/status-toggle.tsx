"use client"

import { Loader2 } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  published: boolean
  onToggle: (published: boolean) => Promise<ActionResult>
  labelOn?: string
  labelOff?: string
}

/**
 * Publish state as a single clickable pill.
 *
 * The label reflects the current state and the tooltip names the action, so the
 * control never leaves the user guessing whether it reads or writes.
 */
export function StatusToggle({ published, onToggle, labelOn = "Published", labelOff = "Draft" }: Props) {
  const { run, pending } = useAction(onToggle)

  return (
    <button
      type="button"
      onClick={() => run(published)}
      disabled={pending}
      aria-busy={pending}
      title={published ? "Unpublish" : "Publish"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold
        transition disabled:opacity-60 ${
          published
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-amber-50 text-amber-700 hover:bg-amber-100"
        }`}
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-amber-500"}`}
        />
      )}
      {published ? labelOn : labelOff}
    </button>
  )
}
