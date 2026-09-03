"use client"

import { Loader2 } from "lucide-react"
import { updateSuggestionStatus } from "@/lib/actions/suggestions"
import { useAction } from "@/lib/use-action"
import { Panel } from "@/components/ui/field"
import { STATUS_LABEL } from "@/lib/suggestion-constants"
import type { SuggestionStatus } from "@prisma/client"

interface Props {
  id: string
  initialStatus: SuggestionStatus
  initialNote: string
}

export function AdminSuggestionForm({ id, initialStatus, initialNote }: Props) {
  const { run, pending } = useAction(updateSuggestionStatus, {})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const status = fd.get("status") as SuggestionStatus
    const note   = (fd.get("adminNote") as string) ?? ""
    run(id, status, note)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Panel
        title="Admin controls"
        footer={
          <button
            type="submit"
            disabled={pending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm
              font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Save changes
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              name="status"
              defaultValue={initialStatus}
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm
                focus:outline-none focus:ring-2 focus:ring-brand/40
                dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {(Object.keys(STATUS_LABEL) as SuggestionStatus[]).map((st) => (
                <option key={st} value={st}>{STATUS_LABEL[st]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin note
              <span className="ml-1 font-normal text-gray-400">(shown to employees)</span>
            </label>
            <textarea
              name="adminNote"
              defaultValue={initialNote}
              rows={4}
              maxLength={500}
              placeholder="Optional message shown alongside the suggestion…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900
                placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2
                focus:ring-brand/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      </Panel>
    </form>
  )
}
