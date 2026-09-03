"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { syncAdPhotos } from "@/lib/actions/ldap-sync"
import { toast } from "@/components/ui/toaster"

export function SyncAdPhotosButton() {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    try {
      const r = await syncAdPhotos()
      const msg = `Synced ${r.synced}, skipped ${r.skipped}${r.failed ? `, failed ${r.failed}` : ""}`
      toast.success("AD photos synced", msg)
    } catch {
      toast.error("Sync failed", "Check server logs")
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2
        text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
      {pending ? "Syncing…" : "Sync AD photos"}
    </button>
  )
}
