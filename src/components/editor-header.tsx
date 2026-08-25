import Link from "next/link"
import { ChevronLeft, ExternalLink } from "lucide-react"

interface Props {
  backHref: string
  backLabel: string
  title: string
  /** Rendered as a "View live" link when the record is published. */
  liveHref?: string
}

/**
 * Breadcrumb-style header for editor routes.
 *
 * A back link beats relying on the browser button: it names where it goes, and
 * it survives arriving here from a redirect after create.
 */
export function EditorHeader({ backHref, backLabel, title, liveHref }: Props) {
  return (
    <header className="mb-6 flex h-9 items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link
          href={backHref}
          className="-ml-1.5 flex items-center gap-1 rounded-md px-1.5 py-1 text-gray-500
            transition hover:bg-gray-100 hover:text-gray-900"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {backLabel}
        </Link>
        <span className="text-gray-300" aria-hidden>
          /
        </span>
        <span className="truncate font-medium text-gray-900">{title}</span>
      </div>

      {liveHref && (
        <Link
          href={liveHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm
            text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          View live
        </Link>
      )}
    </header>
  )
}
