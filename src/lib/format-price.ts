export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
  } catch {
    return `${amount}`
  }
}

export function formatPriceDelta(amount: number, currency: string): string {
  if (amount === 0) return ""
  try {
    const abs = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Math.abs(amount))
    return amount > 0 ? `+${abs}` : `-${abs}`
  } catch {
    return amount > 0 ? `+${amount}` : `${amount}`
  }
}

export function getCurrencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat("en-US", { style: "currency", currency })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value ?? currency
    )
  } catch {
    return currency
  }
}
