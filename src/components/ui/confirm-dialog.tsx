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
        <AlertDialog.Backdrop
          className="fixed inset-0 z-[90] bg-gray-900/25 backdrop-blur-[2px] transition-opacity duration-150
            data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        />
        <AlertDialog.Popup
          className="fixed left-1/2 top-1/2 z-[95] w-[400px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2
            rounded-2xl border border-gray-200 bg-white p-6 shadow-xl outline-none
            transition-all duration-150
            data-[ending-style]:scale-95 data-[ending-style]:opacity-0
            data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
        >
          <AlertDialog.Title className="text-base font-semibold text-gray-900">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-sm leading-relaxed text-gray-500">
            {description}
          </AlertDialog.Description>

          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={pending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700
                transition hover:bg-gray-50 disabled:opacity-50"
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
                  : "bg-gray-900 hover:bg-gray-800"
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
