"use client"

import { useRef } from "react"
import Link from "next/link"
import { Loader2, Plus, Tag } from "lucide-react"
import { createCategory, deleteCategory } from "@/lib/actions/categories"
import { useAction } from "@/lib/use-action"
import { DeleteButton } from "@/components/ui/delete-button"
import { Panel, inputClass } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty-state"

interface Category {
  id: string
  name: string
  slug: string
  articleCount: number
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <Panel
      title="Categories"
      description="Topics used to file articles. Readers filter the feed by them."
    >
      <CategoryForm />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Add a few topics: Announcements, Engineering, People. Articles can then be filed under them."
        />
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 py-2.5">
              <Tag className="size-4 shrink-0 text-gray-300" aria-hidden />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{category.name}</p>
                <p className="truncate font-mono text-xs text-gray-400">?category={category.slug}</p>
              </div>

              {category.articleCount > 0 ? (
                <Link
                  href={`/?category=${category.slug}`}
                  className="shrink-0 text-xs text-gray-400 transition hover:text-brand"
                >
                  {category.articleCount} article{category.articleCount === 1 ? "" : "s"}
                </Link>
              ) : (
                <span className="shrink-0 text-xs text-gray-300">unused</span>
              )}

              <DeleteButton
                variant="icon"
                entity="category"
                name={category.name}
                {...(category.articleCount > 0
                  ? {
                      note: `${category.articleCount} article${
                        category.articleCount === 1 ? "" : "s"
                      } will lose this topic. The articles themselves stay published.`,
                    }
                  : {})}
                onDelete={() => deleteCategory(category.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function CategoryForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { run, pending } = useAction(createCategory, {
    onSuccess: () => {
      formRef.current?.reset()
      // Adding categories is a batch job, so the caret stays put for the next one.
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
        placeholder="Announcements"
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
