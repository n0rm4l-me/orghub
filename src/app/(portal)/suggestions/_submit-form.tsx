"use client"

import { useState, useRef } from "react"
import { Lightbulb, X } from "lucide-react"
import { submitSuggestion } from "@/lib/actions/suggestions"
import { useRouter } from "next/navigation"

interface Category {
  id: string
  name: string
}

interface Props {
  categories: Category[]
}

export function SubmitSuggestionButton({ categories }: Props) {
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [anonymous, setAnonymous]   = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef  = useRef<HTMLTextAreaElement>(null)
  const router   = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const title = titleRef.current?.value.trim() ?? ""
    const body  = bodyRef.current?.value.trim() ?? ""
    if (!title) { setError("Title is required."); return }
    if (!body)  { setError("Description is required."); return }
    setLoading(true)
    try {
      const res = await submitSuggestion({ title, body, categoryId: categoryId || undefined, anonymous })
      if (!res.ok) { setError(res.error); return }
      setOpen(false)
      setCategoryId("")
      setAnonymous(false)
      if (titleRef.current) titleRef.current.value = ""
      if (bodyRef.current)  bodyRef.current.value  = ""
      router.refresh()
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold
          text-white transition-opacity hover:opacity-90"
      >
        <Lightbulb className="size-4" aria-hidden />
        Submit idea
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-popover p-6 shadow-xl sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New suggestion</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="suggestion-title" className="mb-1.5 block text-sm font-medium text-foreground">
                  Title
                </label>
                <input
                  id="suggestion-title"
                  ref={titleRef}
                  type="text"
                  maxLength={200}
                  placeholder="Short, clear headline"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground
                    placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2
                    focus:ring-brand/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="suggestion-body" className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  id="suggestion-body"
                  ref={bodyRef}
                  rows={4}
                  maxLength={5000}
                  placeholder="What problem does this solve? How would it work?"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground
                    placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2
                    focus:ring-brand/20"
                  required
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Category <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          categoryId === c.id
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="size-4 rounded border-border text-brand focus:ring-brand/30"
                />
                <span className="text-sm text-foreground">
                  Submit anonymously
                  <span className="ml-1 text-xs text-muted-foreground">(your name will not be shown to anyone)</span>
                </span>
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm
                    font-semibold text-white disabled:opacity-60"
                >
                  {loading ? "Submitting…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
