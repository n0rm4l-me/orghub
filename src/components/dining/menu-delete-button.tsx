"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteWeekMenu } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"

export function MenuDeleteButton({ menuId }: { menuId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function handleConfirm() {
    start(async () => {
      const res = await deleteWeekMenu(menuId)
      if (!res.ok) { toast.error(res.error); setOpen(false); return }
      toast.success(res.message ?? "Deleted.")
      router.refresh()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={pending}
        className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-left dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Delete menu?</h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              This will permanently remove the menu and all its entries.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={pending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
