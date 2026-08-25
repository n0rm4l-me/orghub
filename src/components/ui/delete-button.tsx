"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  onDelete: () => Promise<ActionResult>
  /** Singular noun used in the dialog copy, e.g. "article". */
  entity: string
  /** The record's own title, quoted back so the user can confirm the target. */
  name?: string
  /** Extra consequence to spell out, e.g. that associations will be dropped. */
  note?: string
  variant?: "link" | "icon"
}

export function DeleteButton({ onDelete, entity, name, note, variant = "link" }: Props) {
  const [open, setOpen] = useState(false)
  const { run, pending } = useAction(onDelete, { onSuccess: () => setOpen(false) })

  const description = [
    name
      ? `"${name}" will be permanently removed.`
      : `This ${entity} will be permanently removed.`,
    note,
    "This cannot be undone.",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Delete ${name ?? entity}`}
          className="grid size-7 place-items-center rounded-md text-gray-400 transition
            hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-gray-500 transition hover:text-red-600"
        >
          Delete
        </button>
      )}

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete this ${entity}?`}
        description={description}
        confirmLabel={pending ? "Deleting…" : "Delete"}
        destructive
        pending={pending}
        onConfirm={() => run()}
      />
    </>
  )
}

/** Inline spinner for row-level actions that do not open a dialog. */
export function Spinner({ className = "size-3.5" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />
}
