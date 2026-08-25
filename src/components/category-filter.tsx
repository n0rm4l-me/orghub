import Link from "next/link"

interface Category {
  id: string
  name: string
  slug: string
}

interface Props {
  categories: Category[]
  active?: string
  /** Carried through so filtering does not silently discard the search term. */
  query?: string
}

/**
 * Plain links rather than router pushes: the filter then works without
 * JavaScript, each state is a shareable URL, and Next prefetches on hover.
 */
export function CategoryFilter({ categories, active, query }: Props) {
  if (categories.length === 0) return null

  const href = (slug?: string) => {
    const search = new URLSearchParams()
    if (slug) search.set("category", slug)
    if (query) search.set("q", query)
    const qs = search.toString()
    return qs ? `/?${qs}` : "/"
  }

  const pill = (selected: boolean) =>
    `inline-block rounded-full px-3 py-1.5 text-sm font-medium transition ${
      selected
        ? "bg-brand text-white shadow-sm"
        : "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
    }`

  return (
    <nav className="mb-5 flex flex-wrap items-center gap-2" aria-label="Filter by category">
      <Link href={href()} aria-current={!active ? "page" : undefined} className={pill(!active)}>
        All
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={href(cat.slug)}
          aria-current={active === cat.slug ? "page" : undefined}
          className={pill(active === cat.slug)}
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  )
}
