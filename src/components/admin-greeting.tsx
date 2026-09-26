"use client"

import { useEffect, useState } from "react"

/**
 * The admin dashboard's greeting and date needed to move out of the server
 * component that renders the rest of the page: `new Date()` there runs on
 * the server (a UTC container), not in the visitor's browser, so "Good
 * evening" could show up at 8am local time. Resolves after mount instead,
 * so it uses the browser's own clock and timezone; the brief pre-mount
 * placeholder is deliberately time-of-day-neutral rather than guessing.
 */
function greetingWord(hour: number): string {
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

export function AdminGreetingTitle({ firstName }: { firstName: string }) {
  const [hour, setHour] = useState<number | null>(null)
  // A one-time read of the client's clock right after mount, not a value
  // React should compute during render or a subscription to an external
  // store: there's nothing to synchronize on every render, and the point is
  // specifically to defer past the server-rendered first paint.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setHour(new Date().getHours()) }, [])
  return <>Good {hour === null ? "day" : greetingWord(hour)}, {firstName}</>
}

export function AdminGreetingDate() {
  const [label, setLabel] = useState<string | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLabel(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))
  }, [])
  return <>{label}</>
}
