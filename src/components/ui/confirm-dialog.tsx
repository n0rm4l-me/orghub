"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Loader2 } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  /** Styles the confirm button as destructive and reddens the icon. */
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
}

/**
 * Replaces `window.confirm` so destructive actions get a focus-trapped,
 * keyboard-dismissable dialog that names what is about to happen.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  pending = false,
  onConfirm,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        {/* The scrim stays dark in both themes: it dims the page, it is not a surface. */}
        <AlertDialog.Backdrop
          className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-[2px] transition-opacity duration-150
            data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        />
        <AlertDialog.Popup
          className="fixed left-1/2 top-1/2 z-[95] w-[400px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2
            rounded-xl border border-border bg-popover p-5 text-popover-foreground shadow-xl outline-none
            transition-all duration-150
            data-[ending-style]:scale-95 data-[ending-style]:opacity-0
            data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
        >
          <AlertDialog.Title className="text-base font-semibold text-foreground">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {description}
          </AlertDialog.Description>

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={pending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground
                transition hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${
                destructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-brand hover:brightness-95 active:brightness-90"
              }`}
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
