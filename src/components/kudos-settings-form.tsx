"use client"

import { useState } from "react"
import { Loader2, Check } from "lucide-react"
import { saveKudosSettings } from "@/lib/actions/kudos"
import { useAction } from "@/lib/use-action"

interface Props {
  monthlyBudget: number
  values: string
  redeemEnabled: boolean
  redeemWebhook: string
  redeemRateLabel: string
}

export function KudosSettingsForm({
  monthlyBudget: initBudget,
  values: initValues,
  redeemEnabled: initRedeemEnabled,
  redeemWebhook: initWebhook,
  redeemRateLabel: initRateLabel,
}: Props) {
  const [budget, setBudget] = useState(String(initBudget))
  const [values, setValues] = useState(initValues)
  const [redeemEnabled, setRedeemEnabled] = useState(initRedeemEnabled)
  const [webhook, setWebhook] = useState(initWebhook)
  const [rateLabel, setRateLabel] = useState(initRateLabel)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const { run, pending } = useAction(saveKudosSettings, {
    onSuccess: () => setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
  })

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set("kudosRedeemEnabled", String(redeemEnabled))
    run(fd)
  }

  const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-base sm:text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
  const labelCls = "mb-1 block text-sm font-medium text-gray-700"

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white px-5 py-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Settings</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="kudosMonthlyBudget" className={labelCls}>
            Monthly coin budget per user
          </label>
          <input
            id="kudosMonthlyBudget"
            name="kudosMonthlyBudget"
            type="number"
            min={0}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">Set to 0 for unlimited.</p>
        </div>

        <div>
          <label htmlFor="kudosValues" className={labelCls}>Company values</label>
          <input
            id="kudosValues"
            name="kudosValues"
            type="text"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="Innovation,Teamwork,Quality"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-400">Comma-separated. Leave empty to hide the values picker.</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Enable Redeem button</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Shows a Redeem button on the kudos wall so users can exchange coins via webhook.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={redeemEnabled}
            onClick={() => setRedeemEnabled((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2
              border-transparent transition-colors ${redeemEnabled ? "bg-brand" : "bg-gray-200"}`}
          >
            <span
              className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow
                transition-transform ${redeemEnabled ? "translate-x-4" : "translate-x-0"}`}
            />
          </button>
        </div>

        {redeemEnabled && (
          <>
            <div>
              <label htmlFor="kudosRedeemWebhook" className={labelCls}>Redeem webhook URL</label>
              <input
                id="kudosRedeemWebhook"
                name="kudosRedeemWebhook"
                type="url"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://your-service.example.com/webhook/kudos-redeem"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-400">
                POST with JSON: userId, email, amount, redemptionId.
              </p>
            </div>

            <div>
              <label htmlFor="kudosRedeemRateLabel" className={labelCls}>Exchange rate label</label>
              <input
                id="kudosRedeemRateLabel"
                name="kudosRedeemRateLabel"
                type="text"
                value={rateLabel}
                onChange={(e) => setRateLabel(e.target.value)}
                placeholder="e.g. 1000 coins = 200 points"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-gray-400">Shown next to the Redeem button.</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium
            text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {pending ? "Saving…" : "Save settings"}
        </button>
        {savedAt && (
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <Check className="size-3 text-emerald-500" />
            Saved at {savedAt}
          </p>
        )}
      </div>
    </form>
  )
}
