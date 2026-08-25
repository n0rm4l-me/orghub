"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Submit button that reflects the enclosing form's pending state.
 *
 * Used for plain `<form action={serverAction}>` submissions that navigate, where
 * there is no `ActionResult` to hook into. Reading `useFormStatus` keeps the
 * button honest without lifting the form into client state, so it still works
 * before hydration.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm",
        "font-medium text-white transition hover:brightness-95 active:brightness-90",
        "disabled:opacity-70",
        className
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  )
}
