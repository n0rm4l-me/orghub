import type { ReactNode } from "react"

interface Props {
  title: string
  /** Short context line: a count, or what the page is for. */
  description?: string
  /** Primary action, rendered flush right. */
  action?: ReactNode
}

/**
 * The single source of truth for admin page headings.
 *
 * The block has a fixed height so switching between admin pages does not nudge
 * the content below it up or down by a few pixels.
 */
export function PageHeader({ title, description, action }: Props) {
  return (
    <header className="mb-6 flex min-h-11 items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {/* Reserved line keeps the header height constant with or without text. */}
        <p className="mt-0.5 min-h-5 text-sm text-gray-500">{description}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  )
}
