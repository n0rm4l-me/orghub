import { describe, it, expect } from "vitest"
import { formatPrice, formatPriceDelta, getCurrencySymbol } from "@/lib/format-price"

describe("formatPrice", () => {
  it("formats JPY without decimals", () => {
    expect(formatPrice(1000, "JPY")).toContain("1,000")
  })

  it("formats USD with two decimal places", () => {
    expect(formatPrice(12.5, "USD")).toContain("12.50")
  })

  it("returns raw number string for invalid currency", () => {
    expect(formatPrice(42, "NOPE")).toBe("42")
  })

  it("formats zero", () => {
    expect(formatPrice(0, "USD")).toContain("0")
  })
})

describe("formatPriceDelta", () => {
  it("returns empty string for zero", () => {
    expect(formatPriceDelta(0, "USD")).toBe("")
  })

  it("prefixes positive with +", () => {
    expect(formatPriceDelta(5, "USD")).toMatch(/^\+/)
  })

  it("prefixes negative with -", () => {
    expect(formatPriceDelta(-3, "USD")).toMatch(/^-/)
  })
})

describe("getCurrencySymbol", () => {
  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$")
  })

  it("returns currency code for unknown currency", () => {
    expect(getCurrencySymbol("NOPE")).toBe("NOPE")
  })
})
