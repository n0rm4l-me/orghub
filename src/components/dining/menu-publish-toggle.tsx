"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, Loader2 } from "lucide-react"
import { publishWeekMenu, unpublishWeekMenu } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"

export function MenuPublishToggle({
  menuId,
  published,
}: {
  menuId: string
  published: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function handle() {
    start(async () => {
      const res = published
        ? await unpublishWeekMenu(menuId)
        : await publishWeekMenu(menuId)
      if (!res.ok) { toast.error(res.error); return }
      router.refresh()
    })
  }

  if (pending) {
    return <Loader2 className="size-3.5 animate-spin text-gray-400" />
  }

  if (published) {
    return (
      <button
        onClick={handle}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Click to unpublish"
      >
        <CheckCircle className="size-3" />
        Published
      </button>
    )
  }

  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400 hover:bg-brand/10 hover:text-brand transition-colors"
      title="Click to publish"
    >
      Draft
    </button>
  )
}
