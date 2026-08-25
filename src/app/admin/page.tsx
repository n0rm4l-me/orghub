import { db } from "@/lib/db"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Plus, FileText, Files, Users, Tag, ArrowRight } from "lucide-react"
import { requireRole, can } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"

export const metadata = { title: "Dashboard" }

export default async function AdminDashboard() {
  const user = await requireRole("EDITOR")

  const [published, drafts, pageCount, categoryCount, activeUsers, recent] = await Promise.all([
    db.article.count({ where: { published: true } }),
    db.article.count({ where: { published: false } }),
    db.page.count(),
    db.category.count(),
    db.user.count({ where: { active: true } }),
    db.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        published: true,
        updatedAt: true,
        author: { select: { name: true, email: true } },
      },
    }),
  ])

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
          sub={drafts > 0 ? `${drafts} awaiting review` : "nothing in drafts"}
        />
        <StatCard href="/admin/pages" icon={Files} label="Pages" value={pageCount} sub="reference content" />
        <StatCard
          href="/admin/categories"
          icon={Tag}
          label="Categories"
          value={categoryCount}
          sub="topics on the feed"
        />
        {can.manageUsers(user) ? (
          <StatCard
            href="/admin/users"
            icon={Users}
            label="Active users"
            value={activeUsers}
            sub="can sign in"
          />
        ) : (
          <StatCard icon={Users} label="Active users" value={activeUsers} sub="can sign in" />
        )}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex h-12 items-center justify-between border-b border-gray-100 px-5">
          <h2 className="text-sm font-semibold text-gray-900">Recently edited</h2>
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
            description="Publish your first announcement and it will show up on the portal feed."
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                    {article.title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {article.author.name ?? article.author.email}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-gray-300">
                    {article.updatedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  sub,
}: {
  href?: string
  icon: LucideIcon
  label: string
  value: number
  sub: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <Icon className="size-4 text-gray-300" aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
    </>
  )

  const shell = "rounded-xl border border-gray-200 bg-white p-4"

  // Cards that lead somewhere are links; the rest stay inert rather than looking
  // clickable and doing nothing.
  return href ? (
    <Link href={href} className={`${shell} transition hover:border-gray-300 hover:shadow-sm`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  )
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

function firstName(name: string | null, email: string): string {
  if (name) return name.split(" ")[0]!
  return email.split("@")[0]!
}
