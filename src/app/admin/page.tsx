import { db } from "@/lib/db"
import Link from "next/link"
import { Plus, FileText, Files, Users, Tag, ArrowRight, CalendarDays, Eye, Award } from "lucide-react"
import { requireRole, can } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { StatCard } from "@/components/ui/stat-card"
import { getSettings } from "@/lib/settings"
import { parseModules } from "@/lib/modules"

export const metadata = { title: "Dashboard" }

export default async function AdminDashboard() {
  const user = await requireRole("EDITOR")

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const [published, drafts, pageCount, categoryCount, activeUsers, recent, pinnedCount, upcomingCount, settings, totalViews, topArticles] = await Promise.all([
    db.article.count({ where: { published: true } }),
    db.article.count({ where: { published: false } }),
    db.page.count(),
    db.category.count(),
    db.user.count({ where: { active: true } }),
    db.article.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        published: true,
        publishedAt: true,
        coverImage: true,
        author: { select: { name: true, email: true } },
      },
    }),
    db.article.count({ where: { published: true, pinned: true } }),
    db.article.count({ where: { published: true, eventDate: { gte: new Date() } } }),
    getSettings(),
    db.articleView.count(),
    db.article.findMany({
      where: { published: true },
      orderBy: { views: { _count: "desc" } },
      take: 5,
      select: {
        id: true,
        title: true,
        coverImage: true,
        publishedAt: true,
        _count: { select: { views: true } },
      },
    }),
  ])

  const enabledModules = parseModules(settings.enabledModules)
  const kudosThisMonth = enabledModules.has("kudos")
    ? await db.kudos.count({ where: { createdAt: { gte: monthStart } } })
    : 0

  return (
    <div>
      <PageHeader
        title={`Good ${greeting()}, ${firstName(user.name, user.email)}`}
        description={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
        action={
          <Link
            href="/admin/articles/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
              font-medium text-white transition hover:brightness-95 active:brightness-90"
          >
            <Plus className="size-4" aria-hidden />
            New article
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          href="/admin/articles"
          icon={FileText}
          label="Published"
          value={published}
          sub={drafts > 0 ? `${drafts} awaiting review` : "Nothing in drafts"}
        />
        <StatCard href="/admin/pages" icon={Files} label="Pages" value={pageCount} sub="Reference content" />
        <StatCard
          href="/admin/categories"
          icon={Tag}
          label="Categories"
          value={categoryCount}
          sub="Topics on the feed"
        />
        {enabledModules.has("events") && (
          <StatCard
            href="/admin/events"
            icon={CalendarDays}
            label="Upcoming events"
            value={upcomingCount}
            sub={pinnedCount > 0 ? `${pinnedCount} pinned` : "None pinned"}
          />
        )}
        {enabledModules.has("kudos") && (
          <StatCard
            href="/admin/kudos"
            icon={Award}
            label="Kudos this month"
            value={kudosThisMonth}
            sub="Recognitions sent"
          />
        )}
        <StatCard
          href="/admin/articles"
          icon={Eye}
          label="Total views"
          value={totalViews}
          sub="Unique reads across all articles"
        />
        {can.manageUsers(user) ? (
          <StatCard
            href="/admin/users"
            icon={Users}
            label="Active users"
            value={activeUsers}
            sub="Can sign in"
          />
        ) : (
          <StatCard icon={Users} label="Active users" value={activeUsers} sub="Can sign in" />
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex h-12 items-center justify-between border-b border-gray-100 px-5">
          <h2 className="text-sm font-semibold text-gray-900">Recently published</h2>
          <Link
            href="/admin/articles"
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition
              hover:text-brand"
          >
            All articles
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing here yet"
            description="Publish your first article and it will show up on the portal feed."
            action={{ label: "Write an article", href: "/admin/articles/new" }}
          />
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((article) => (
              <li key={article.id}>
                <Link
                  href={`/admin/articles/${article.id}/edit`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/70"
                >
                  <span
                    aria-hidden
                    className={`size-1.5 shrink-0 rounded-full ${
                      article.published ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                  {article.coverImage && (
                    <img src={article.coverImage} alt="" className="size-8 shrink-0 rounded object-cover" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                    {article.title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {article.author.name ?? article.author.email}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-gray-300">
                    {article.publishedAt
                      ? article.publishedAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {topArticles.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex h-12 items-center justify-between border-b border-gray-100 px-5">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Eye className="size-3.5 text-gray-400" aria-hidden />
              Most read
            </h2>
            <Link
              href="/admin/articles"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition
                hover:text-brand"
            >
              All articles
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {topArticles.map((article, i) => (
              <li key={article.id}>
                <Link
                  href={`/admin/articles/${article.id}/edit`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/70"
                >
                  <span className="w-4 shrink-0 text-center text-xs font-semibold text-gray-300">
                    {i + 1}
                  </span>
                  {article.coverImage && (
                    <img src={article.coverImage} alt="" className="size-8 shrink-0 rounded object-cover" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                    {article.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                    <Eye className="size-3" aria-hidden />
                    {article._count.views}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}


function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

function firstName(name: string | null, email: string): string {
  if (name) {
    // AD stores displayName as "Lastname, Firstname" — take the part after the comma
    const commaIdx = name.indexOf(",")
    if (commaIdx !== -1) return name.slice(commaIdx + 1).trim().split(" ")[0]!
    return name.split(" ")[0]!
  }
  return email.split("@")[0]!
}
