export type MealStatus = "open" | "upcoming" | "ended" | null

export type MealStatusInfo = { status: MealStatus; opensAt?: string }

function parseHours(hours: string) {
  const m = hours.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return { startH: +m[1], startM: +m[2], endH: +m[3], endM: +m[4] }
}

/** Meal-slot status in the venue's local timezone. Safe on both server and client. */
export function getMealStatus(hours: string | null, timezone: string): MealStatusInfo {
  if (!hours) return { status: null }
  const parsed = parseHours(hours)
  if (!parsed) return { status: null }

  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date())
  const hPart = tzParts.find((p) => p.type === "hour")
  const mPart = tzParts.find((p) => p.type === "minute")
  if (!hPart || !mPart) return { status: null }

  const nowMins = +hPart.value * 60 + +mPart.value
  const startMins = parsed.startH * 60 + parsed.startM
  const endMins = parsed.endH * 60 + parsed.endM
  const pad = (n: number) => String(n).padStart(2, "0")
  const opensAt = `${pad(parsed.startH)}:${pad(parsed.startM)}`

  // A slot ending before it starts runs past midnight (e.g. 22:00-01:00), so the
  // open window wraps instead of being a plain start..end range.
  if (endMins < startMins) {
    return nowMins >= startMins || nowMins <= endMins
      ? { status: "open" }
      : { status: "upcoming", opensAt }
  }

  if (nowMins < startMins) return { status: "upcoming", opensAt }
  if (nowMins <= endMins) return { status: "open" }
  return { status: "ended" }
}
