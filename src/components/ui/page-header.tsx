import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"

interface Props {
  title: string
  /** Short context line: a count, or what the page is for. */
  description?: string
  /** Primary action, rendered flush right. */
  action?: ReactNode
  /** When provided, renders a back link above the heading. */
  back?: { href: string; label: string }
}

/**
 * The single source of truth for page headings, in the admin and the portal.
 *
 * The inner flex block has a fixed height so switching between pages does not
 * nudge the content below it up or down by a few pixels.
 */
export function PageHeader({ title, description, action, back }: Props) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-md px-1 py-0.5
            text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex min-h-11 items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {/* Reserved line keeps the header height constant with or without text. */}
          <p className="mt-0.5 min-h-5 text-sm text-muted-foreground">{description}</p>
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </header>
  )
}
