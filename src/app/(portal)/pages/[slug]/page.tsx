import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ArticleBody } from "@/components/article-body"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { getQuickLinks, getUpcomingEvents } from "@/lib/nav"
import { SidebarBlocks } from "@/components/sidebar-blocks"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PublicPagePage({ params }: Props) {
  const { slug } = await params

  const [settings, page, quickLinks, upcomingEvents, categories] = await Promise.all([
    getSettings(),
    db.page.findUnique({
      where: { slug, published: true },
      select: {
        id: true,
        title: true,
        body: true,
        slug: true,
        parent: { select: { title: true, slug: true } },
        children: {
          where: { published: true },
          orderBy: [{ order: "asc" }, { title: "asc" }],
          select: { id: true, title: true, slug: true },
        },
      },
    }),
    getQuickLinks(),
    getUpcomingEvents(),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ])

  if (!parseModules(settings.enabledModules).has("pages")) notFound()
  if (!page) notFound()

  const pagesLayout = settings.pagesLayout ?? "content"
  const eventsEnabled = parseModules(settings.enabledModules).has("events")
  const rightBlocks = settings.sidebarOrder?.split(",").filter(Boolean) ?? ["quickLinks", "browseByTopic", "upcomingEvents"]
  const leftBlocks  = settings.leftSidebarOrder?.split(",").filter(Boolean) ?? []
  const showLeft  = pagesLayout === "sidebar-left"  || pagesLayout === "sidebar-both"
  const showRight = pagesLayout === "sidebar-right" || pagesLayout === "sidebar-both"

  const content = (
    <>
      {page.parent && (
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gray-700 transition dark:hover:text-gray-200">Home</Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <Link href={`/pages/${page.parent.slug}`} className="hover:text-gray-700 transition dark:hover:text-gray-200">
            {page.parent.title}
          </Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <span className="text-gray-800 dark:text-gray-200">{page.title}</span>
        </nav>
      )}

      <h1 className="text-4xl font-bold text-gray-900 mb-8 dark:text-gray-100">{page.title}</h1>

      <div className="bg-white rounded-2xl p-8 border border-gray-100 dark:bg-gray-900 dark:border-gray-700">
        <ArticleBody body={page.body as object} />
      </div>

      {page.children.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">In this section</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {page.children.map((child) => (
              <Link
                key={child.id}
                href={`/pages/${child.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200
                  bg-white px-4 py-3.5 transition hover:border-gray-300 hover:shadow-sm
                  dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{child.title}</span>
                <ChevronRight className="size-4 shrink-0 text-gray-400" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )

  if (!showLeft && !showRight) {
    return <>{content}</>
  }

  return (
    <div className="flex items-start gap-8">
      {showLeft && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <SidebarBlocks blocks={leftBlocks} eventsEnabled={eventsEnabled} quickLinks={quickLinks} categories={categories} upcomingEvents={upcomingEvents} />
        </aside>
      )}
      <div className="min-w-0 flex-1">{content}</div>
      {showRight && (
        <aside className="sticky top-20 hidden w-64 shrink-0 space-y-4 lg:block">
          <SidebarBlocks blocks={rightBlocks} eventsEnabled={eventsEnabled} quickLinks={quickLinks} categories={categories} upcomingEvents={upcomingEvents} />
        </aside>
      )}
    </div>
  )
}
