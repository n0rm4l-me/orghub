import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ArticleBodyHtml } from "@/components/article-body-html"
import { renderArticleBodyHtml } from "@/lib/render-article-body"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"
import { PortalPageLayout } from "@/components/portal-page-layout"
import { PageHeader } from "@/components/ui/page-header"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PublicPagePage({ params }: Props) {
  const { slug } = await params

  const [settings, page] = await Promise.all([
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
  ])

  const enabled = parseModules(settings.enabledModules)
  if (!enabled.has("pages")) notFound()
  if (!page) notFound()

  const pagesLayout = settings.pagesLayout ?? "content"
  const eventsEnabled = enabled.has("events")
  const pollsEnabled  = enabled.has("polls")
  const kudosEnabled  = enabled.has("kudos")

  const content = (
    <>
      {page.parent && (
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition">Home</Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <Link href={`/pages/${page.parent.slug}`} className="hover:text-foreground transition">
            {page.parent.title}
          </Link>
          <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          <span className="text-foreground">{page.title}</span>
        </nav>
      )}

      <PageHeader title={page.title} />

      <div className="bg-card rounded-xl p-8 border border-border">
        <ArticleBodyHtml html={renderArticleBodyHtml(page.body)} />
      </div>

      {page.children.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">In this section</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {page.children.map((child) => (
              <Link
                key={child.id}
                href={`/pages/${child.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border
                  bg-card px-4 py-3.5 transition hover:border-muted-foreground/40 hover:shadow-sm"
              >
                <span className="text-sm font-medium text-foreground">{child.title}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )

  return (
    <PortalPageLayout
      layout={pagesLayout}
      sidebarOrder={settings.sidebarOrder}
      leftSidebarOrder={settings.leftSidebarOrder}
      eventsEnabled={eventsEnabled}
      pollsEnabled={pollsEnabled}
      kudosEnabled={kudosEnabled}
      gravatarsEnabled={settings.gravatarsEnabled}
    >
      {content}
    </PortalPageLayout>
  )
}
