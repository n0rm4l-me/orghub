"use client"

import { useState } from "react"
import { Pencil, Check, X } from "lucide-react"
import { updateAdminNote } from "@/lib/actions/suggestions"

interface Props {
  id: string
  initialNote: string | null
}

export function EditNoteButton({ id, initialNote }: Props) {
  const [open, setOpen]     = useState(false)
  const [note, setNote]     = useState(initialNote ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateAdminNote(id, note)
    setSaving(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Edit admin note"
        className="grid size-8 place-items-center rounded-md text-gray-400
          transition-colors hover:bg-gray-100 hover:text-gray-700
          dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
    )
  }

  return (
    <div className="mt-2 flex items-start gap-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="Admin note (visible to employees)…"
        className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs
          focus:border-brand focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={saving}
        title="Save"
        className="grid size-7 place-items-center rounded-md bg-brand/10 text-brand hover:bg-brand/20 disabled:opacity-60"
      >
        <Check className="size-4" aria-hidden />
      </button>
      <button
        onClick={() => { setOpen(false); setNote(initialNote ?? "") }}
        title="Cancel"
        className="grid size-7 place-items-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
