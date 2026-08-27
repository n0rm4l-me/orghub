"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, ArrowUp, ArrowDown, ChevronDown, Check } from "lucide-react"
import { createPoll, updatePoll } from "@/lib/actions/polls"
import { toast } from "@/components/ui/toaster"

interface PollData {
  id: string
  question: string
  status: "DRAFT" | "ACTIVE" | "CLOSED"
  anonymous: boolean
  multiChoice: boolean
  resultsVisibility: "ALWAYS" | "AFTER_VOTE" | "AFTER_CLOSE" | "NEVER"
  endsAt: string
}

interface Props {
  poll?: PollData
  options?: string[]
}

export function PollForm({ poll, options: initialOptions }: Props) {
  const router = useRouter()
  const isEdit = !!poll

  const [question, setQuestion] = useState(poll?.question ?? "")
  const [opts, setOpts] = useState<string[]>(initialOptions ?? ["", ""])
  const [anonymous, setAnonymous] = useState(poll?.anonymous ?? false)
  const [multiChoice, setMultiChoice] = useState(poll?.multiChoice ?? false)
  const [resultsVisibility, setResultsVisibility] = useState<string>(poll?.resultsVisibility ?? "AFTER_VOTE")
  const [status, setStatus] = useState<string>(poll?.status ?? "DRAFT")
  const [endsAt, setEndsAt] = useState(poll?.endsAt ?? "")
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("question", question)
    opts.forEach((o) => fd.append("option", o))
    fd.set("anonymous", String(anonymous))
    fd.set("multiChoice", String(multiChoice))
    fd.set("resultsVisibility", resultsVisibility)
    fd.set("status", status)
    fd.set("endsAt", endsAt)

    startTransition(async () => {
      const result = isEdit ? await updatePoll(poll.id, fd) : await createPoll(fd)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (result.message) toast.success(result.message)
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
      if (!isEdit && "data" in result) {
        router.push(`/admin/polls/${result.data}`)
      } else {
        router.refresh()
      }
    })
  }

  function moveOpt(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= opts.length) return
    const next = [...opts]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    setOpts(next)
  }

  const inputCls = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
  const selectCls = `${inputCls} appearance-none pr-8`
  const labelCls = "mb-1 block text-sm font-medium text-gray-700"

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:gap-8">

        {/* Main column */}
        <div className="min-w-0 w-full flex-1 space-y-5 rounded-xl border border-gray-200 bg-white p-6">
          <div>
            <label htmlFor="question" className={labelCls}>Question</label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              className={inputCls}
              maxLength={500}
            />
          </div>

          <div>
            <p className={labelCls}>Options</p>
            <div className="space-y-2">
              {opts.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const next = [...opts]
                      next[i] = e.target.value
                      setOpts(next)
                    }}
                    placeholder={`Option ${i + 1}`}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => moveOpt(i, -1)}
                    disabled={i === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOpt(i, 1)}
                    disabled={i === opts.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  {opts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setOpts(opts.filter((_, j) => j !== i))}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Remove"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {opts.length < 10 && (
              <button
                type="button"
                onClick={() => setOpts([...opts, ""])}
                className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline"
              >
                <Plus className="size-3.5" />
                Add option
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:sticky lg:top-8 lg:w-64 lg:shrink-0 space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Settings</h2>

            <div className="space-y-3">
              <div>
                <label htmlFor="status" className={labelCls}>Status</label>
                <div className="relative">
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={selectCls}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                </div>
              </div>

              <div>
                <label htmlFor="resultsVisibility" className={labelCls}>Results visible</label>
                <div className="relative">
                  <select
                    id="resultsVisibility"
                    value={resultsVisibility}
                    onChange={(e) => setResultsVisibility(e.target.value)}
                    className={selectCls}
                  >
                    <option value="ALWAYS">Always</option>
                    <option value="AFTER_VOTE">After voting</option>
                    <option value="AFTER_CLOSE">After close</option>
                    <option value="NEVER">Never (admin only)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                </div>
              </div>

              <div>
                <label htmlFor="endsAt" className={labelCls}>Closing date (optional)</label>
                <input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="size-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  Anonymous voting
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={multiChoice}
                    onChange={(e) => setMultiChoice(e.target.checked)}
                    className="size-4 rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  Allow multiple choices
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm
                font-medium text-white transition hover:brightness-95 active:brightness-90
                disabled:opacity-60"
            >
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create poll"}
            </button>

            <p className="mt-2 flex min-h-4 items-center justify-center gap-1 text-[11px] text-gray-400">
              {pending ? (
                "Saving…"
              ) : savedAt ? (
                <>
                  <Check className="size-3 text-emerald-500" aria-hidden />
                  Saved at {savedAt}
                </>
              ) : null}
            </p>
          </section>
        </aside>

      </div>
    </form>
  )
}
