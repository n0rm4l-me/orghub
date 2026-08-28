"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { createRedeemType, updateRedeemType, deleteRedeemType } from "@/lib/actions/kudos"
import { toast } from "@/components/ui/toaster"

type RedeemType = {
  id: string
  label: string
  rateLabel: string | null
  webhook: string | null
  active: boolean
  order: number
}

interface Props {
  initialTypes: RedeemType[]
}

interface FormState { label: string; rateLabel: string; webhook: string }

const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
const lbl = "mb-1 block text-xs font-medium text-gray-700"

function TypeForm({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial: FormState
  onSave: (s: FormState) => void
  onCancel: () => void
  busy: boolean
}) {
  const [s, setS] = useState(initial)
  const set = (k: keyof FormState, v: string) => setS((p) => ({ ...p, [k]: v }))
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div>
        <label className={lbl}>Label *</label>
        <input type="text" value={s.label} onChange={(e) => set("label", e.target.value)} placeholder="Gift Card" className={inputCls} />
      </div>
      <div>
        <label className={lbl}>Rate label</label>
        <input type="text" value={s.rateLabel} onChange={(e) => set("rateLabel", e.target.value)} placeholder="1000 coins = 200 pts" className={inputCls} />
      </div>
      <div>
        <label className={lbl}>
          Webhook URL{" "}
          <span className="font-normal text-gray-400">(overrides global fallback)</span>
        </label>
        <input type="url" value={s.webhook} onChange={(e) => set("webhook", e.target.value)} placeholder="https://..." className={inputCls} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSave(s)}
          disabled={busy || !s.label.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-95 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-3 animate-spin" />}
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 transition hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  )
}

export function KudosRedeemTypesPanel({ initialTypes }: Props) {
  const router = useRouter()
  const [types, setTypes] = useState(initialTypes)
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => { setTypes(initialTypes) }, [initialTypes])

  function handleCreate(s: FormState) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("label", s.label)
      fd.set("rateLabel", s.rateLabel)
      fd.set("webhook", s.webhook)
      const res = await createRedeemType(fd)
      if (!res.ok) { toast.error(res.error); return }
      toast.success("Type added.")
      setAddOpen(false)
      router.refresh()
    })
  }

  function handleUpdate(id: string, s: FormState) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("label", s.label)
      fd.set("rateLabel", s.rateLabel)
      fd.set("webhook", s.webhook)
      const res = await updateRedeemType(id, fd)
      if (!res.ok) { toast.error(res.error); return }
      toast.success("Saved.")
      setEditId(null)
      router.refresh()
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      const t = types.find((x) => x.id === id)
      if (!t) return
      const fd = new FormData()
      fd.set("label", t.label)
      fd.set("rateLabel", t.rateLabel ?? "")
      fd.set("webhook", t.webhook ?? "")
      fd.set("active", String(active))
      const res = await updateRedeemType(id, fd)
      if (!res.ok) { toast.error(res.error); return }
      setTypes((ts) => ts.map((x) => x.id === id ? { ...x, active } : x))
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteRedeemType(id)
      if (!res.ok) { toast.error(res.error); return }
      setTypes((ts) => ts.filter((t) => t.id !== id))
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Redemption types</h2>
        {!addOpen && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand transition hover:brightness-90"
          >
            <Plus className="size-3.5" aria-hidden />
            Add type
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-gray-400">
        Each type can have its own rate label and webhook. Leave webhook empty to use the global fallback.
        Users pick a type in the redeem dialog when multiple types are active.
      </p>

      {types.length === 0 && !addOpen && (
        <p className="text-sm text-gray-400">No types yet — users see a plain coin redeem flow.</p>
      )}

      <div className="space-y-2">
        {types.map((t) =>
          editId === t.id ? (
            <TypeForm
              key={t.id}
              initial={{ label: t.label, rateLabel: t.rateLabel ?? "", webhook: t.webhook ?? "" }}
              onSave={(s) => handleUpdate(t.id, s)}
              onCancel={() => setEditId(null)}
              busy={pending}
            />
          ) : (
            <div key={t.id} className="flex items-center gap-1.5 rounded-lg border border-gray-100 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{t.label}</p>
                {t.rateLabel && <p className="truncate text-xs text-gray-400">{t.rateLabel}</p>}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={t.active}
                onClick={() => handleToggle(t.id, !t.active)}
                title={t.active ? "Active — click to disable" : "Inactive — click to enable"}
                className={`relative mr-1 inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${t.active ? "bg-brand" : "bg-gray-200"}`}
              >
                <span className={`pointer-events-none inline-block size-3 rounded-full bg-white shadow transition-transform ${t.active ? "translate-x-3" : "translate-x-0"}`} />
              </button>
              <button
                type="button"
                onClick={() => setEditId(t.id)}
                className="grid size-6 place-items-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Edit"
              >
                <Pencil className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(t.id)}
                className="grid size-6 place-items-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label="Delete"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          )
        )}

        {addOpen && (
          <TypeForm
            initial={{ label: "", rateLabel: "", webhook: "" }}
            onSave={handleCreate}
            onCancel={() => setAddOpen(false)}
            busy={pending}
          />
        )}
      </div>
    </div>
  )
}
