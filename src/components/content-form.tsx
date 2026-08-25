"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Editor } from "@/components/editor"
import { Loader2, Check, Circle, CircleDot } from "lucide-react"
import { useAction } from "@/lib/use-action"
import { toast } from "@/components/ui/toaster"
import type { ActionResult } from "@/lib/actions/types"

interface Category {
  id: string
  name: string
  slug: string
}

export interface ContentFormValues {
  id?: string
  title: string
  excerpt?: string | null
  body: object
  published: boolean
  categoryId?: string
  eventDate?: Date | null
  eventEndDate?: Date | null
  eventLocation?: string | null
}

interface Props {
  /** `article` shows the summary and category fields; `page` hides them. */
  kind: "article" | "page"
  values?: ContentFormValues
  categories?: Category[]
  action: (formData: FormData) => Promise<ActionResult<{ id: string }>>
  /**
   * URL template to navigate to after a successful create. Use `{id}` as a
   * placeholder for the new record's id, e.g. `/admin/articles/{id}/edit`.
   * Must be a plain string — functions cannot cross the Server→Client boundary.
   */
  redirectAfterCreate?: string
}

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] }

export function ContentForm({
  kind,
  values,
  categories = [],
  action,
  redirectAfterCreate,
}: Props) {
  const router = useRouter()
  const isNew = !values?.id

  const [body, setBody] = useState<object>(values?.body ?? EMPTY_DOC)
  const [published, setPublished] = useState(values?.published ?? false)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const label = kind === "article" ? "Article" : "Page"

  const { run, pending } = useAction(action, {
    silent: true,
    onSuccess: (data) => {
      setDirty(false)
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))

      if (isNew && data && redirectAfterCreate) {
        toast.success(published ? `${label} published.` : "Draft created.")
        router.push(redirectAfterCreate.replace("{id}", data.id))
        return
      }
      toast.success("Changes saved.")
    },
  })

  const submit = useCallback(() => {
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    formData.set("body", JSON.stringify(body))
    formData.set("published", String(published))
    run(formData)
  }, [body, published, run])

  // Ctrl/Cmd+S is muscle memory in any editor; without it the browser opens a
  // save-page dialog over the app.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        if (!pending) submit()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [submit, pending])

  // Closing the tab mid-draft should cost a confirmation, not the draft.
  useEffect(() => {
    if (!dirty) return
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onChange={() => setDirty(true)}
    >
      <div className="flex items-start gap-8">
        <div className="min-w-0 flex-1 space-y-4">
          <input
            name="title"
            type="text"
            defaultValue={values?.title ?? ""}
            required
            maxLength={200}
            autoFocus={isNew}
            placeholder={`${label} title`}
            aria-label={`${label} title`}
            className="w-full border-none bg-transparent text-3xl font-bold tracking-tight text-gray-900
              caret-[var(--brand)] outline-none placeholder:text-gray-300"
          />

          {kind === "article" && (
            <input
              name="excerpt"
              type="text"
              defaultValue={values?.excerpt ?? ""}
              maxLength={300}
              placeholder="One-line summary shown in the feed"
              aria-label="Summary"
              className="w-full border-none bg-transparent text-base text-gray-500
                caret-[var(--brand)] outline-none placeholder:text-gray-300"
            />
          )}

          <Editor
            initialContent={values?.body ?? EMPTY_DOC}
            onChange={(next) => {
              setBody(next)
              setDirty(true)
            }}
          />
        </div>

        <aside className="sticky top-8 w-64 shrink-0 space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Publishing</h2>

            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm text-gray-600">Visibility</span>
              <button
                type="button"
                onClick={() => {
                  setPublished((v) => !v)
                  setDirty(true)
                }}
                aria-pressed={published}
                title={published ? "Switch to draft" : "Switch to published"}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs
                  font-semibold transition ${
                    published
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {published ? (
                  <CircleDot className="size-3" aria-hidden />
                ) : (
                  <Circle className="size-3" aria-hidden />
                )}
                {published ? "Published" : "Draft"}
              </button>
            </div>

            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm
                font-medium text-white transition hover:brightness-95 active:brightness-90
                disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {pending ? "Saving…" : isNew ? `Create ${kind}` : "Save changes"}
            </button>

            {/* Fixed-height status line so the panel never resizes. */}
            <p className="mt-2 flex min-h-4 items-center justify-center gap-1 text-[11px] text-gray-400">
              {dirty ? (
                "Unsaved changes"
              ) : savedAt ? (
                <>
                  <Check className="size-3 text-emerald-500" aria-hidden />
                  Saved at {savedAt}
                </>
              ) : (
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1 font-sans">⌘S</kbd>
              )}
            </p>
          </section>

          {kind === "article" && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Event</h2>
              <p className="mb-3 text-xs text-gray-400 leading-relaxed">
                Optional. Fill in to show this article as a calendar event.
              </p>
              <div className="space-y-3">
                <div>
                  <label htmlFor="eventDate" className="mb-1 block text-xs text-gray-600">Start date &amp; time</label>
                  <input
                    id="eventDate"
                    name="eventDate"
                    type="datetime-local"
                    defaultValue={
                      values?.eventDate
                        ? new Date(values.eventDate).toISOString().slice(0, 16)
                        : ""
                    }
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700
                      outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label htmlFor="eventEndDate" className="mb-1 block text-xs text-gray-600">End date &amp; time</label>
                  <input
                    id="eventEndDate"
                    name="eventEndDate"
                    type="datetime-local"
                    defaultValue={
                      values?.eventEndDate
                        ? new Date(values.eventEndDate).toISOString().slice(0, 16)
                        : ""
                    }
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700
                      outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label htmlFor="eventLocation" className="mb-1 block text-xs text-gray-600">Location</label>
                  <input
                    id="eventLocation"
                    name="eventLocation"
                    type="text"
                    maxLength={200}
                    defaultValue={values?.eventLocation ?? ""}
                    placeholder="e.g. Room A, 3F"
                    className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700
                      outline-none placeholder:text-gray-300 focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>
            </section>
          )}

          {kind === "article" && (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-2.5 text-sm font-semibold text-gray-900">Category</h2>
              {categories.length === 0 ? (
                <p className="text-xs leading-relaxed text-gray-400">
                  No categories defined yet.
                </p>
              ) : (
                <div className="space-y-0.5">
                  <Radio
                    name="categoryId"
                    value=""
                    label="None"
                    defaultChecked={!values?.categoryId}
                  />
                  {categories.map((cat) => (
                    <Radio
                      key={cat.id}
                      name="categoryId"
                      value={cat.id}
                      label={cat.name}
                      defaultChecked={values?.categoryId === cat.id}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
    </form>
  )
}

function Radio({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string
  value: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <label
      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-gray-700
        transition hover:bg-gray-50"
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-3.5 accent-[var(--brand)]"
      />
      <span className="truncate">{label}</span>
    </label>
  )
}
