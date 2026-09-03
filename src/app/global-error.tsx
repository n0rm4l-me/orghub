"use client"

import "./globals.css"
import { ErrorState } from "@/components/error-state"

/**
 * Last resort: catches failures in the root layout itself, which in practice
 * means the settings query, which in practice means the database is unreachable.
 *
 * It has to supply its own `<html>`/`<body>` because the layout that normally
 * provides them is the thing that broke, and for the same reason it cannot use
 * the brand colour: the `:root` variable is injected by that layout.
 */
export default function GlobalError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground antialiased">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <ErrorState {...props} branded={false} />
        </main>
      </body>
    </html>
  )
}
