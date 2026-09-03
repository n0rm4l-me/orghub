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
    const res = await submitSuggestion({ title, body, categoryId: categoryId || undefined, anonymous })
    setLoading(false)
    if (!res.ok) { setError(res.error); return }
    setOpen(false)
    setCategoryId("")
    setAnonymous(false)
    if (titleRef.current) titleRef.current.value = ""
    if (bodyRef.current)  bodyRef.current.value  = ""
    router.refresh()
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-900 sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New suggestion</h2>
              <button
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100
                  dark:hover:bg-gray-800"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  maxLength={200}
                  placeholder="Short, clear headline"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900
                    placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2
                    focus:ring-brand/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  ref={bodyRef}
                  rows={4}
                  maxLength={5000}
                  placeholder="What problem does this solve? How would it work?"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900
                    placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2
                    focus:ring-brand/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  required
                />
              </div>

              {categories.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category <span className="font-normal text-gray-400">(optional)</span>
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
                            : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
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
                  className="size-4 rounded border-gray-300 text-brand focus:ring-brand/30"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Submit anonymously
                  <span className="ml-1 text-xs text-gray-400">(your name will not be shown to anyone)</span>
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
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100
                    dark:text-gray-400 dark:hover:bg-gray-800"
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
