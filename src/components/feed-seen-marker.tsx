"use client"

import { useEffect } from "react"
import { markFeedSeen } from "@/lib/actions/feed"

export function FeedSeenMarker() {
  useEffect(() => {
    markFeedSeen()
  }, [])

  return null
}
