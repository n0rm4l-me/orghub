"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Loader2, CheckCircle } from "lucide-react"
import { upsertTopic, deleteTopic, publishTopic, unpublishTopic } from "@/lib/actions/dining"
import { toast } from "@/components/ui/toaster"
import { MediaPickerField } from "@/components/media-picker"
import { inputClass } from "@/components/ui/field"

type Topic = { id: string; venueId: string; title: string; bannerImage: string | null; body: string | null; publishedAt: Date | null }

const lbl = "mb-1 block text-xs font-medium text-gray-700"

function TopicForm({ venueId, topic, onDone }: { venueId: string; topic?: Topic; onDone: () => void }) {
  const router = useRouter()
  const [banner, setBanner] = useState(topic?.bannerImage ?? "")
  const [pending, start] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const res = await upsertTopic(venueId, topic?.id ?? null, {
        title: (fd.get("title") as string).trim(),
        bannerImage: banner || null,
        body: (fd.get("body") as string) || null,
        highlights: [],
      })
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Saved.")
      onDone()
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white px-5 py-5">
      <h3 className="text-sm font-semibold text-gray-900">{topic ? "Edit announcement" : "New announcement"}</h3>
      <div>
        <label className={lbl}>Title *</label>
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
          className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
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
  const [pending, start] = useTransition()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleDelete(id: string) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    setConfirmDeleteId(null)
    start(async () => {
      const res = await deleteTopic(id)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Deleted.")
      router.refresh()
    })
  }

  function handlePublish(id: string, isActive: boolean) {
    start(async () => {
      const res = isActive ? await unpublishTopic(id) : await publishTopic(id)
      if (!res.ok) { toast.error(res.error); return }
      toast.success(res.message ?? "Done.")
      router.refresh()
    })
  }

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
        <p className="text-sm text-gray-400">No announcements yet.</p>
      )}

      {topics.map((t) =>
        editId === t.id ? (
          <TopicForm key={t.id} venueId={venueId} topic={t} onDone={() => setEditId(null)} />
        ) : (
          <div key={t.id} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{t.title}</p>
                {t.body && <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{t.body}</p>}
              </div>
              <div className="flex items-center gap-2">
                {t.publishedAt ? (
                  <button onClick={() => handlePublish(t.id, true)} disabled={pending}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60">
                    <CheckCircle className="size-3" /> Current
                  </button>
                ) : (
                  <button onClick={() => handlePublish(t.id, false)} disabled={pending}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-60">
                    Set as current
                  </button>
                )}
                <button onClick={() => setEditId(t.id)} className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <Pencil className="size-3.5" />
                </button>
                {confirmDeleteId === t.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(t.id)} disabled={pending}
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
                      Confirm
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)}
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-400 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleDelete(t.id)} disabled={pending} className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
