"use client"

import { useState, useTransition } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Gift, Loader2, X } from "lucide-react"
import { redeemKudos } from "@/lib/actions/kudos"
import { toast } from "@/components/ui/toaster"

interface RedeemType {
  id: string
  label: string
  rateLabel: string | null
}

interface Props {
  available: number
  types: RedeemType[]
}

export function RedeemableBalance({ available, types }: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(available)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    types.length > 0 ? types[0].id : null
  )
  const [pending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      const res = await redeemKudos(amount, selectedTypeId ?? undefined)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Redemption submitted!")
      setOpen(false)
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="flex-1 cursor-pointer rounded-lg py-2 text-center transition
          hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:outline-none
          focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{available}</p>
        <p className="mt-0.5 text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70">
          Available · tap to redeem
        </p>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-[90] bg-gray-900/25 backdrop-blur-[2px] transition-opacity duration-150
            data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        />
        <Dialog.Popup
          className="fixed left-1/2 top-1/2 z-[95] w-80 -translate-x-1/2 -translate-y-1/2
            rounded-2xl border border-gray-200 bg-white p-6 shadow-xl outline-none
            transition-all duration-150
            data-[ending-style]:scale-95 data-[ending-style]:opacity-0
            data-[starting-style]:scale-95 data-[starting-style]:opacity-0
            dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-start justify-between gap-2">
            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Redeem coins
            </Dialog.Title>
            <Dialog.Close
              className="grid size-7 shrink-0 place-items-center rounded-md text-gray-400
                transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="mt-1 text-sm text-gray-500">
            You have <span className="font-semibold text-gray-900 dark:text-gray-100">{available}</span> coins available.
          </Dialog.Description>

          <div className="mt-5 space-y-3">
            {types.length >= 2 && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">Redeem for</p>
                <div className="space-y-1.5">
                  {types.map((t) => (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition ${
                        selectedTypeId === t.id
                          ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20"
                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="redeemType"
                        value={t.id}
                        checked={selectedTypeId === t.id}
                        onChange={() => setSelectedTypeId(t.id)}
                        className="accent-emerald-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.label}</p>
                        {t.rateLabel && (
                          <p className="text-xs text-gray-400">{t.rateLabel}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {types.length === 1 && (
              <p className="text-xs text-gray-500">
                Redeem for: <span className="font-medium text-gray-700 dark:text-gray-200">{types[0].label}</span>
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input
                type="number"
                min={1}
                max={available}
                value={amount}
                onChange={(e) =>
                  setAmount(Math.max(1, Math.min(available, parseInt(e.target.value) || 1)))
                }
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900
                  focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20
                  dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Dialog.Close
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium
                  text-gray-700 transition hover:bg-gray-50
                  dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </Dialog.Close>
              <button
                type="button"
                onClick={submit}
                disabled={pending || amount < 1 || (types.length >= 2 && !selectedTypeId)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2
                  text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Gift className="size-3.5" />}
                Redeem
              </button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
