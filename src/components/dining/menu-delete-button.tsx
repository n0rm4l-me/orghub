"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteWeekMenu } from "@/lib/actions/dining"
import { useAction } from "@/lib/use-action"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export function MenuDeleteButton({ menuId }: { menuId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { run, pending } = useAction(deleteWeekMenu, {
    onSuccess: () => {
      setOpen(false)
      router.refresh()
    },
  })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label="Delete menu"
        className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete menu?"
        description="This will permanently remove the menu and all its entries."
        confirmLabel="Delete"
        destructive
        pending={pending}
        onConfirm={() => run(menuId)}
      />
    </>
  )
}
