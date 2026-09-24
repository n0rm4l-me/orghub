import { notFound } from "next/navigation"
import { requireRole } from "@/lib/rbac"
import { db } from "@/lib/db"
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/suggestion-constants"
import { PageHeader } from "@/components/ui/page-header"
import { Panel } from "@/components/ui/field"
import { AdminSuggestionForm } from "./_admin-form"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminSuggestionEditPage({ params }: Props) {
  await requireRole("EDITOR")

  const { id } = await params

  const s = await db.suggestion.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      category: { select: { id: true, name: true } },
      status: true,
      adminNote: true,
      anonymous: true,
      hidden: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
      _count: { select: { votes: true, comments: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          isAdminReply: true,
          createdAt: true,
          author: { select: { name: true, email: true } },
        },
      },
    },
  })

  if (!s) notFound()

  const authorLabel = s.anonymous ? "Anonymous" : (s.author?.name ?? s.author?.email?.split("@")[0] ?? "—")

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={s.title}
        description={`${authorLabel} · ${new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
        back={{ href: "/admin/suggestions", label: "Suggestions" }}
      />

      {/* Meta */}
      <div className="mb-6 flex flex-wrap gap-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[s.status]}`}>
          {STATUS_LABEL[s.status]}
        </span>
        {s.category && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {s.category.name}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{s._count.votes} votes · {s._count.comments} comments</span>
      </div>

      {/* Body */}
      <Panel title="Suggestion">
        <p className="whitespace-pre-wrap text-sm text-foreground">{s.body}</p>
      </Panel>

      {/* Edit form with toast */}
      <div className="mt-6">
        <AdminSuggestionForm
          id={s.id}
          initialStatus={s.status}
          initialNote={s.adminNote ?? ""}
        />
      </div>

      {/* Comments */}
      {s.comments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Comments ({s.comments.length})
          </h2>
          <div className="space-y-2">
            {s.comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-3 text-sm ${
                  c.isAdminReply
                    ? "border-brand/20 bg-brand/5 dark:bg-brand/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-muted-foreground">
                    {c.author?.name ?? c.author?.email?.split("@")[0] ?? "Deleted user"}
                  </span>
                  {c.isAdminReply && (
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">Admin</span>
                  )}
                  <span>{new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
                <p className="whitespace-pre-wrap text-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
