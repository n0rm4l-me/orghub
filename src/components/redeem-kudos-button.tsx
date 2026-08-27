"use client"

import { useState, useTransition } from "react"
import { Gift, Loader2 } from "lucide-react"
import { redeemKudos } from "@/lib/actions/kudos"
import { toast } from "@/components/ui/toaster"

interface Props {
  available: number
  rateLabel: string | null
}

export function RedeemButton({ available, rateLabel }: Props) {
  const [amount, setAmount] = useState(available)
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await redeemKudos(amount)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Redemption submitted!")
    })
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <input
        type="number"
        min={1}
        max={available}
        value={amount}
        onChange={(e) => setAmount(Math.max(1, Math.min(available, parseInt(e.target.value) || 1)))}
        className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-center text-base sm:text-sm text-gray-900
          focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />
      {rateLabel && <p className="text-[10px] text-gray-400">{rateLabel}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending || amount < 1}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs
          font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Gift className="size-3" />}
        Redeem
      </button>
    </div>
  )
}
