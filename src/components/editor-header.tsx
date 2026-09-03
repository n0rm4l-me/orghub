import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"

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
 * Thin wrapper around PageHeader: keeps the 10 editor-route call sites stable
 * while centralising the back-link rendering in PageHeader.
 *
 * A back link beats relying on the browser button: it names where it goes, and
 * it survives arriving here from a redirect after create.
 */
export function EditorHeader({ backHref, backLabel, title, liveHref }: Props) {
  return (
    <PageHeader
      title={title}
      back={{ href: backHref, label: backLabel }}
      action={
        liveHref ? (
          <Link
            href={liveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm
              text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            View live
          </Link>
        ) : undefined
      }
    />
  )
}
