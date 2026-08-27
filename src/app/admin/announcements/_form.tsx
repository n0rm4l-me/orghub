"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, Circle } from "lucide-react"
import { useAction } from "@/lib/use-action"
import type { ActionResult } from "@/lib/actions/types"

export type AnnouncementFormValues = {
  message?: string
  linkUrl?: string | null
  linkLabel?: string | null
  color?: string
  showFrom?: Date | null
  showUntil?: Date | null
}

interface Props {
  values?: AnnouncementFormValues
  action: (formData: FormData) => Promise<ActionResult>
  redirectAfterSave: string
}

const COLORS = [
  { id: "brand",   label: "Brand",  dot: "bg-brand" },
  { id: "amber",   label: "Amber",  dot: "bg-amber-400" },
  { id: "red",     label: "Red",    dot: "bg-red-500" },
  { id: "emerald", label: "Green",  dot: "bg-emerald-500" },
]

const toLocalDT = (d: Date | null | undefined) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""

export function AnnouncementForm({ values, action, redirectAfterSave }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [color, setColor] = useState(values?.color ?? "brand")
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const { run, pending } = useAction(action, {
    silent: true,
    onSuccess: () => {
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
      router.push(redirectAfterSave)
    },
  })

  function submit() {
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    fd.set("color", color)
    run(fd)
  }

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit() }}>
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:gap-8">
        {/* Main field */}
        <div className="min-w-0 w-full flex-1">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-6">
            <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-gray-900">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              maxLength={300}
              rows={3}
              defaultValue={values?.message ?? ""}
              placeholder="System maintenance on Saturday from 10:00 to 12:00."
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900
                outline-none placeholder:text-gray-300 focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-xs text-gray-400">300 characters max.</p>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-8 lg:w-64 lg:shrink-0">
          {/* Save */}
          <section className="order-last rounded-xl border border-gray-200 bg-white p-4 lg:order-first">
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2 text-sm
                font-medium text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              {pending ? "Saving…" : "Save"}
            </button>
            <p className="mt-2 flex min-h-4 items-center justify-center gap-1 text-[11px] text-gray-400">
              {savedAt ? (
                <>
                  <Check className="size-3 text-emerald-500" aria-hidden />
                  Saved at {savedAt}
                </>
              ) : null}
            </p>
          </section>

          {/* Color */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Color</h2>
            <div className="grid grid-cols-2 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium
                    transition ${color === c.id ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <span className={`size-2.5 shrink-0 rounded-full ${c.dot}`} aria-hidden />
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          {/* Schedule */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Schedule</h2>
            <p className="mb-3 text-xs leading-relaxed text-gray-400">
              Leave blank to show always while active.
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="showFrom" className="mb-1 block text-xs text-gray-600">Show from</label>
                <input
                  id="showFrom"
                  name="showFrom"
                  type="datetime-local"
                  defaultValue={toLocalDT(values?.showFrom)}
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700
                    outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="showUntil" className="mb-1 block text-xs text-gray-600">Show until</label>
                <input
                  id="showUntil"
                  name="showUntil"
                  type="datetime-local"
                  defaultValue={toLocalDT(values?.showUntil)}
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700
                    outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          </section>

          {/* Link */}
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2.5 text-sm font-semibold text-gray-900">Call-to-action link</h2>
            <div className="space-y-2">
              <input
                name="linkUrl"
                type="url"
                defaultValue={values?.linkUrl ?? ""}
                placeholder="https://…"
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700
                  outline-none placeholder:text-gray-300 focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <input
                name="linkLabel"
                type="text"
                defaultValue={values?.linkLabel ?? ""}
                placeholder='Label (default "Learn more")'
                className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700
                  outline-none placeholder:text-gray-300 focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </section>
        </aside>
      </div>
    </form>
  )
}
