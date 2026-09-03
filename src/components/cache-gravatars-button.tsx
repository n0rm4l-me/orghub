"use client"

import { useState } from "react"
import { UserCircle } from "lucide-react"
import { cacheAllGravatars } from "@/lib/actions/media-migrate"
import { toast } from "@/components/ui/toaster"

export function CacheGravatarsButton() {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    setPending(true)
    try {
      const res = await cacheAllGravatars()
      if (!res.ok) { toast.error(res.error ?? "Failed"); return }
      toast.success("Gravatars cached", `Cached ${res.cached ?? 0}, skipped ${res.skipped ?? 0}`)
    } catch {
      toast.error("Failed", "Check server logs")
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
      <UserCircle className={`size-4 ${pending ? "animate-pulse" : ""}`} aria-hidden />
      {pending ? "Caching…" : "Cache Gravatars"}
    </button>
  )
}
