"use client"

import { useRef } from "react"
import Link from "next/link"
import { ChevronUp, ChevronDown, ExternalLink, Loader2, Plus } from "lucide-react"
import { setPageInNav, movePage, createQuickLink, deleteQuickLink, moveQuickLink } from "@/lib/actions/nav"
import { useAction } from "@/lib/use-action"
import { DeleteButton } from "@/components/ui/delete-button"
import { Panel, inputClass } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty-state"

interface Page {
  id: string
  title: string
  slug: string
  published: boolean
  showInNav: boolean
}

interface QuickLink {
  id: string
  label: string
  url: string
}

export function NavManager({ pages, links }: { pages: Page[]; links: QuickLink[] }) {
  return (
    <div className="space-y-6">
      <Panel
        title="Main menu"
        description="Published pages listed here appear in the portal header, in this order."
      >
        {pages.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            No pages yet.{" "}
            <Link href="/admin/pages/new" className="font-medium text-brand hover:underline">
              Create one
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pages.map((page, i) => (
              <PageRow
                key={page.id}
                page={page}
                isFirst={i === 0}
                isLast={i === pages.length - 1}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Quick links"
        description="Shortcuts shown in the feed sidebar. Use them for tools that live outside the portal."
      >
        <QuickLinkForm />

        {links.length === 0 ? (
          <EmptyState
            icon={ExternalLink}
            title="No quick links yet"
            description="Add shortcuts to payroll, the service desk, or the VPN guide."
          />
        ) : (
          <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
            {links.map((link, i) => (
              <LinkRow
                key={link.id}
                link={link}
                isFirst={i === 0}
                isLast={i === links.length - 1}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function PageRow({ page, isFirst, isLast }: { page: Page; isFirst: boolean; isLast: boolean }) {
  const toggle = useAction(setPageInNav)
  const move = useAction(movePage)
  const busy = toggle.pending || move.pending

  return (
    <li className="flex items-center gap-3 py-2.5" data-pending={busy || undefined}>
      <Reorder
        isFirst={isFirst}
        isLast={isLast}
        pending={move.pending}
        onMove={(dir) => move.run(page.id, dir)}
        label={page.title}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{page.title}</p>
        <p className="truncate font-mono text-xs text-gray-400">/pages/{page.slug}</p>
      </div>

      {!page.published && (
        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          Draft
        </span>
      )}

      <label className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={page.showInNav}
          disabled={busy}
          onChange={(e) => toggle.run(page.id, e.target.checked)}
          className="size-4 rounded border-gray-300 accent-[var(--brand)]"
        />
        In menu
      </label>
    </li>
  )
}

function LinkRow({ link, isFirst, isLast }: { link: QuickLink; isFirst: boolean; isLast: boolean }) {
  const move = useAction(moveQuickLink)

  return (
    <li className="flex items-center gap-3 py-2.5" data-pending={move.pending || undefined}>
      <Reorder
        isFirst={isFirst}
        isLast={isLast}
        pending={move.pending}
        onMove={(dir) => move.run(link.id, dir)}
        label={link.label}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{link.label}</p>
        <p className="truncate font-mono text-xs text-gray-400">{link.url}</p>
      </div>

      <DeleteButton
        variant="icon"
        entity="quick link"
        name={link.label}
        onDelete={() => deleteQuickLink(link.id)}
      />
    </li>
  )
}

function QuickLinkForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const { run, pending } = useAction(createQuickLink, {
    onSuccess: () => formRef.current?.reset(),
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
        name="label"
        aria-label="Link label"
        placeholder="Service desk"
        required
        maxLength={40}
        className={`${inputClass} flex-1`}
      />
      <input
        name="url"
        aria-label="Link destination"
        placeholder="https://helpdesk.example.com"
        required
        className={`${inputClass} flex-[2]`}
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

/** Up/down pair with both buttons always present, so rows never change width. */
function Reorder({
  isFirst,
  isLast,
  pending,
  onMove,
  label,
}: {
  isFirst: boolean
  isLast: boolean
  pending: boolean
  onMove: (direction: "up" | "down") => void
  label: string
}) {
  const base =
    "grid size-5 place-items-center rounded text-gray-400 transition enabled:hover:bg-gray-100 " +
    "enabled:hover:text-gray-700 disabled:opacity-25"

  return (
    <div className="flex shrink-0 flex-col" aria-hidden={pending}>
      <button
        type="button"
        onClick={() => onMove("up")}
        disabled={isFirst || pending}
        aria-label={`Move ${label} up`}
        className={base}
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove("down")}
        disabled={isLast || pending}
        aria-label={`Move ${label} down`}
        className={base}
      >
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  )
}
