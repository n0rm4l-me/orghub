"use client"

import { ErrorState } from "@/components/error-state"

/**
 * Keeps a failed admin page inside the console shell, so the sidebar is still
 * there to navigate away with instead of stranding the editor on a dead screen.
 */
export default function AdminError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState {...props} />
}
