"use client"

import { useRef } from "react"
import { Loader2, Plus, Tag } from "lucide-react"
import { createSuggestionCategory, deleteSuggestionCategory } from "@/lib/actions/suggestion-categories"
import { useAction } from "@/lib/use-action"
import { DeleteButton } from "@/components/ui/delete-button"
import { Panel, inputClass } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty-state"

interface Category {
  id: string
  name: string
  count: number
}

export function SuggestionCategoryManager({ categories }: { categories: Category[] }) {
  return (
    <Panel
      title="Categories"
      description="Employees pick one of these when submitting a suggestion."
    >
      <CategoryForm />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Add topics like Product, Process, Culture. Employees can then tag their ideas."
        />
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <Tag className="size-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
              </div>

              {c.count > 0 ? (
                <span className="shrink-0 text-xs text-gray-400">
                  {c.count} idea{c.count === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-gray-300 dark:text-gray-600">unused</span>
              )}

              <DeleteButton
                variant="icon"
                entity="category"
                name={c.name}
                {...(c.count > 0
                  ? {
                      note: `${c.count} suggestion${c.count === 1 ? "" : "s"} will lose this category. The suggestions themselves stay.`,
                    }
                  : {})}
                onDelete={() => deleteSuggestionCategory(c.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function CategoryForm() {
  const formRef  = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { run, pending } = useAction(createSuggestionCategory, {
    onSuccess: () => {
      formRef.current?.reset()
      inputRef.current?.focus()
    },
  })

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault()
        run(new FormData(e.currentTarget))
      }}
      className="flex gap-2"
    >
      <input
        ref={inputRef}
        name="name"
        aria-label="Category name"
        placeholder="Product, Process, Culture…"
        required
        maxLength={60}
        className={`${inputClass} flex-1`}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
          font-medium text-white transition hover:brightness-95 active:brightness-90
          disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Plus className="size-3.5" aria-hidden />
        )}
        Add
      </button>
    </form>
  )
}
