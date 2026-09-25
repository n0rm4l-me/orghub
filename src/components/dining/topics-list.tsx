"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Loader2, CheckCircle, Megaphone } from "lucide-react"
import { upsertTopic, deleteTopic, publishTopic, unpublishTopic } from "@/lib/actions/dining"
import { useAction } from "@/lib/use-action"
import { MediaPickerField } from "@/components/media-picker"
import { inputClass } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type Topic = { id: string; venueId: string; title: string; bannerImage: string | null; body: string | null; publishedAt: Date | null }

const lbl = "mb-1 block text-xs font-medium text-foreground"

function TopicForm({ venueId, topic, onDone }: { venueId: string; topic?: Topic; onDone: () => void }) {
  const router = useRouter()
  const [banner, setBanner] = useState(topic?.bannerImage ?? "")

  const { run, pending } = useAction(
    (fd: FormData) =>
      upsertTopic(venueId, topic?.id ?? null, {
        title: (fd.get("title") as string).trim(),
        bannerImage: banner || null,
        body: (fd.get("body") as string) || null,
        highlights: [],
      }),
    { onSuccess: () => { onDone(); router.refresh() } }
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    run(new FormData(e.currentTarget))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card px-5 py-5">
      <h3 className="text-sm font-semibold text-foreground">{topic ? "Edit announcement" : "New announcement"}</h3>
      <div>
        <label className={lbl}>Title <span aria-hidden="true">*</span></label>
        <input name="title" defaultValue={topic?.title} required placeholder="August theme" className={inputClass} />
      </div>
      <div>
        <label className={lbl}>Banner image</label>
        <MediaPickerField value={banner} onChange={setBanner} folder="dining" />
      </div>
      <div>
        <label className={lbl}>Body</label>
        <textarea name="body" rows={3} defaultValue={topic?.body ?? ""} placeholder="Theme description…" className={inputClass} />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone}
          className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          Cancel
        </button>
        <button type="submit" disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:opacity-60">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </button>
      </div>
    </form>
  )
}

export function TopicsList({ venueId, topics }: { venueId: string; topics: Topic[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { run: runDelete, pending: deletePending } = useAction(deleteTopic, {
    onSuccess: () => { setConfirmDeleteId(null); router.refresh() },
  })

  const { run: runPublish, pending: publishPending } = useAction(
    (id: string, isActive: boolean) => (isActive ? unpublishTopic(id) : publishTopic(id)),
    { onSuccess: () => router.refresh() }
  )

  const pending = deletePending || publishPending

  return (
    <div className="space-y-4">
      {!showForm && !editId && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:brightness-95"
          >
            <Plus className="size-4" aria-hidden />
            New announcement
          </button>
        </div>
      )}

      {showForm && <TopicForm venueId={venueId} onDone={() => setShowForm(false)} />}

      {topics.length === 0 && !showForm && (
        <EmptyState icon={Megaphone} title="No announcements yet" />
      )}

      {topics.map((t) =>
        editId === t.id ? (
          <TopicForm key={t.id} venueId={venueId} topic={t} onDone={() => setEditId(null)} />
        ) : (
          <div key={t.id} className="rounded-xl border border-border bg-card px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t.title}</p>
                {t.body && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.body}</p>}
              </div>
              <div className="flex items-center gap-2">
                {t.publishedAt ? (
                  <button onClick={() => runPublish(t.id, true)} disabled={pending}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
                    <CheckCircle className="size-3" /> Current
                  </button>
                ) : (
                  <button onClick={() => runPublish(t.id, false)} disabled={pending}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-border disabled:opacity-60">
                    Set as current
                  </button>
                )}
                <button onClick={() => setEditId(t.id)} aria-label="Edit" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-muted-foreground">
                  <Pencil className="size-3.5" />
                </button>
                <button onClick={() => setConfirmDeleteId(t.id)} disabled={pending} aria-label="Delete" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Delete this announcement?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={deletePending}
        onConfirm={() => confirmDeleteId && runDelete(confirmDeleteId)}
      />
    </div>
  )
}
