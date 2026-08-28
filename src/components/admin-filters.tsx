"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { Search, X, Loader2 } from "lucide-react"

interface StatusOption {
  value: string
  label: string
}

interface Props {
  basePath: string
  query?: string
  status?: string
  placeholder: string
  /** Hides the status segmented control for lists without a status. */
  showStatus?: boolean
  /** Custom status options. Defaults to Published / Drafts when omitted. */
  statusOptions?: StatusOption[]
}

const DEBOUNCE_MS = 300

/**
 * Search box plus status filter for admin tables.
 *
 * Typing debounces into the URL rather than firing a request per keystroke, and
 * the pending transition is surfaced in the input so a slow query does not look
 * like a dropped one. Filter state lives in the URL, so a filtered view is
 * shareable and survives a reload.
 */
const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
]

export function AdminFilters({
  basePath,
  query = "",
  status,
  placeholder,
  showStatus = true,
  statusOptions,
}: Props) {
  const resolvedOptions = statusOptions ?? DEFAULT_STATUS_OPTIONS
  const router = useRouter()
  const [value, setValue] = useState(query)
  const [seenQuery, setSeenQuery] = useState(query)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Adjust the field when the URL changed from outside it: a back navigation, or
  // a "Show all" link. Comparing trimmed values means the resync cannot strip a
  // space the user has only just typed, and doing it during render rather than in
  // an effect avoids a second commit with stale text on screen.
  if (query !== seenQuery) {
    setSeenQuery(query)
    if (query !== value.trim()) setValue(query)
  }

  useEffect(() => {
    if (value.trim() === query) return
    const timer = setTimeout(() => {
      const search = new URLSearchParams()
      if (value.trim()) search.set("q", value.trim())
      if (status) search.set("status", status)
      const qs = search.toString()
      startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, query, status, basePath, router])

  const statusHref = (next?: string) => {
    const search = new URLSearchParams()
    if (value.trim()) search.set("q", value.trim())
    if (next) search.set("status", next)
    const qs = search.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const tab = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition ${
      active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
    }`

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setValue("")
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white pr-9 pl-9 text-sm
            text-gray-900 transition placeholder:text-gray-400 hover:border-gray-300
            focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
        />
        {/* One reserved slot holds either the spinner or the clear button, so
            the input's inner edge never moves. */}
        <span className="absolute top-1/2 right-2.5 grid size-5 -translate-y-1/2 place-items-center">
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin text-gray-400" aria-hidden />
          ) : (
            value && (
              <button
                type="button"
                onClick={() => {
                  setValue("")
                  inputRef.current?.focus()
                }}
                aria-label="Clear search"
                className="grid size-5 place-items-center rounded text-gray-400 transition
                  hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="size-3.5" />
              </button>
            )
          )}
        </span>
      </div>

      {showStatus && (
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-lg bg-gray-100 p-0.5"
          role="group"
          aria-label="Filter by status"
        >
          <a href={statusHref()} className={tab(!status)}>
            All
          </a>
          {resolvedOptions.map((opt) => (
            <a key={opt.value} href={statusHref(opt.value)} className={tab(status === opt.value)}>
              {opt.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
