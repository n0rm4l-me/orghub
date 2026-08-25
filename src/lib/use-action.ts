"use client"

import { useCallback, useTransition } from "react"
import { toast } from "@/components/ui/toaster"
import type { ActionResult } from "@/lib/actions/types"

interface Options<T> {
  onSuccess?: (data: T | undefined) => void
  /** Suppresses the success toast when the caller shows its own feedback. */
  silent?: boolean
}

/**
 * Runs a server action inside a transition and turns its `ActionResult` into a
 * toast, so every mutation in the app reports the same way.
 *
 * `run` never rejects: a thrown action would otherwise leave the button stuck in
 * its pending state with nothing on screen to explain why.
 */
export function useAction<A extends unknown[], T = undefined>(
  action: (...args: A) => Promise<ActionResult<T>>,
  options: Options<T> = {}
) {
  const [pending, startTransition] = useTransition()
  const { onSuccess, silent } = options

  const run = useCallback(
    (...args: A) => {
      startTransition(async () => {
        try {
          const result = await action(...args)
          // A redirecting action resolves with nothing; the router takes over.
          if (!result) return

          if (result.ok) {
            if (result.message && !silent) toast.success(result.message)
            onSuccess?.("data" in result ? (result.data as T) : undefined)
          } else {
            toast.error(result.error)
          }
        } catch {
          toast.error(
            "Could not reach the server",
            "Your change was not saved. Check your connection and try again."
          )
        }
      })
    },
    [action, onSuccess, silent]
  )

  return { run, pending }
}
