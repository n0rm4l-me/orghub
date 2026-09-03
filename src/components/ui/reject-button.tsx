"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

interface Props {
  onReject: () => Promise<ActionResult>
  name?: string
}

export function RejectButton({ onReject, name }: Props) {
  const [open, setOpen] = useState(false)
  const { run, pending } = useAction(onReject, { onSuccess: () => setOpen(false) })

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
      >
        Reject
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reject this redemption?"
        description={`${name ? `Redemption for "${name}" ` : "This redemption "}will be marked as rejected. The coins will remain available to the user.`}
        confirmLabel={pending ? "Rejecting…" : "Reject"}
        destructive
        pending={pending}
        onConfirm={() => run()}
      />
    </>
  )
}
