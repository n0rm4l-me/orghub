import Link from "next/link"

interface Props {
  basePath: string
  page: number
  totalPages: number
  /** Current query string values, carried across page changes. */
  params: Record<string, string | undefined>
  /** URL param name to use for the page number. Defaults to "page". */
  pageParam?: string
}

/**
 * Prev/next pager.
 *
 * Both ends stay rendered when unavailable, styled as disabled, so the row does
 * not reflow between the first, middle, and last page.
 */
export function TablePagination({ basePath, page, totalPages, params, pageParam = "page" }: Props) {
  const href = (n: number) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== pageParam) search.set(key, value)
    }
    if (n > 1) search.set(pageParam, String(n))
    const qs = search.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const base = "rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium transition"
  const enabled = `${base} bg-white text-gray-700 hover:bg-gray-50`
  const disabled = `${base} cursor-not-allowed bg-gray-50 text-gray-300`

  return (
    <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className={enabled} rel="prev">
          ← Previous
        </Link>
      ) : (
        <span className={disabled} aria-disabled>
          ← Previous
        </span>
      )}

      <span className="text-xs text-gray-400">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={enabled} rel="next">
          Next →
        </Link>
      ) : (
        <span className={disabled} aria-disabled>
          Next →
        </span>
      )}
    </nav>
  )
}
