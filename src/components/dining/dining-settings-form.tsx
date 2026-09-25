"use client"

import { useRef } from "react"
import { Loader2 } from "lucide-react"
import { saveDiningSettings } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"

const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CHF", label: "Swiss Franc (CHF)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "BRL", label: "Brazilian Real (R$)" },
  { code: "MXN", label: "Mexican Peso (MX$)" },
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "CNY", label: "Chinese Yuan (¥)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "KRW", label: "Korean Won (₩)" },
  { code: "RUB", label: "Russian Ruble (₽)" },
  { code: "HKD", label: "Hong Kong Dollar (HK$)" },
  { code: "SEK", label: "Swedish Krona (kr)" },
  { code: "NOK", label: "Norwegian Krone (kr)" },
  { code: "DKK", label: "Danish Krone (kr)" },
]

interface Props {
  currency: string
}

export function DiningSettingsForm({ currency }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const { run, pending } = useAction(saveDiningSettings)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    run(new FormData(e.currentTarget))
  }

  const isCustom = !CURRENCIES.some((c) => c.code === currency)

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Dining settings</h2>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Currency</label>
          <select
            name="diningCurrency"
            defaultValue={isCustom ? "__custom" : currency}
            onChange={(e) => {
              if (e.target.value === "__custom") return
            }}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
            {isCustom && (
              <option value={currency}>{currency} (custom)</option>
            )}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            ISO 4217 code used when displaying prices across the dining module.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
