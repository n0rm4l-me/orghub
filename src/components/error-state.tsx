"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
  /**
   * Falls back to a neutral button when the brand variable is unavailable, which
   * is the case in `global-error` because the root layout never rendered.
   */
  branded?: boolean
}

/**
 * Shared body for every error boundary.
 *
 * The message names a digest rather than the error itself: a stack trace on a
 * user-facing screen is both useless to them and a disclosure risk, while the
 * digest is enough for an operator to find the matching server log line.
 */
export function ErrorState({ error, reset, branded = true }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="size-6 text-red-500" strokeWidth={1.5} />
      </div>
      <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        The page failed to load. Retrying often resolves it. If it keeps happening,
        share the reference below with your IT team.
      </p>
      {error.digest && (
        <code className="mt-3 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500">
          {error.digest}
        </code>
      )}
      <button
        onClick={reset}
        className={`mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm
          font-medium text-white transition hover:brightness-95 active:brightness-90 ${
            branded ? "bg-brand" : "bg-gray-900"
          }`}
      >
        <RotateCcw className="size-4" />
        Try again
      </button>
    </div>
  )
}
