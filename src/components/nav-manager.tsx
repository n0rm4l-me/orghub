"use client"

import { Fragment, useRef } from "react"
import Link from "next/link"
import { ChevronUp, ChevronDown, ExternalLink, Loader2, Plus } from "lucide-react"
import { setPageInNav, movePage, createQuickLink, deleteQuickLink, moveQuickLink } from "@/lib/actions/nav"
import { toggleNavItem, moveNavItem } from "@/lib/actions/settings"
import { useAction } from "@/lib/use-action"
import { DeleteButton } from "@/components/ui/delete-button"
import { Panel, inputClass } from "@/components/ui/field"
import { EmptyState } from "@/components/ui/empty-state"
import type { ModuleId } from "@/lib/modules"

interface ModuleNavItem {
  id: string
  label: string
  visible: boolean
}

interface Page {
  id: string
  title: string
  slug: string
  published: boolean
  showInNav: boolean
  parentId: string | null
}

interface QuickLink {
  id: string
  label: string
  url: string
}

interface Props {
  moduleItems: ModuleNavItem[]
  pages: Page[]
  links: QuickLink[]
}

export function NavManager({ moduleItems, pages, links }: Props) {
  const topLevel = pages.filter((p) => !p.parentId)
  const childrenOf = (id: string) => pages.filter((p) => p.parentId === id)
  const hasModuleItems = moduleItems.length > 0

  return (
    <div className="space-y-6">
      <Panel
        title="Main menu"
        description="Header navigation order. Feed is always first."
      >
        <ul className="divide-y divide-gray-100">
          {/* Static Feed item */}
          <li className="flex items-center gap-3 py-2.5 opacity-40 select-none">
            <div className="flex shrink-0 flex-col">
              <div className="grid size-5 place-items-center" />
              <div className="grid size-5 place-items-center" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900">Feed</span>
            <Toggle checked disabled />
          </li>

          {/* Module items: Calendar, Polls */}
          {moduleItems.map((item, i) => (
            <ModuleRow
              key={item.id}
              item={item}
              isFirst={i === 0}
              isLast={i === moduleItems.length - 1}
            />
          ))}

          {/* Pages */}
          {!hasModuleItems && pages.length === 0 ? (
            <li className="py-4 text-center text-sm text-gray-400">
              No pages yet.{" "}
              <Link href="/admin/pages/new" className="font-medium text-brand hover:underline">
                Create one
              </Link>
            </li>
          ) : (
            topLevel.map((page, i) => {
              const children = childrenOf(page.id)
              return (
                <Fragment key={page.id}>
                  <PageRow page={page} isFirst={i === 0} isLast={i === topLevel.length - 1} />
                  {children.map((child, j) => (
                    <PageRow
                      key={child.id}
                      page={child}
                      isFirst={j === 0}
                      isLast={j === children.length - 1}
                      indent
                    />
                  ))}
                </Fragment>
              )
            })
          )}
        </ul>
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

function ModuleRow({
  item,
  isFirst,
  isLast,
}: {
  item: ModuleNavItem
  isFirst: boolean
  isLast: boolean
}) {
  const toggle = useAction(toggleNavItem)
  const move = useAction(moveNavItem)
  const busy = toggle.pending || move.pending

  return (
    <li className="flex items-center gap-3 py-2.5" data-pending={busy || undefined}>
      <Reorder
        isFirst={isFirst}
        isLast={isLast}
        pending={move.pending}
        onMove={(dir) => move.run(item.id, dir)}
        label={item.label}
      />

      <span className="flex-1 text-sm font-medium text-gray-900">{item.label}</span>

      <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
        module
      </span>

      <Toggle
        checked={item.visible}
        disabled={busy}
        onChange={() => toggle.run(item.id)}
      />
    </li>
  )
}

function PageRow({
  page,
  isFirst,
  isLast,
  indent,
}: {
  page: Page
  isFirst: boolean
  isLast: boolean
  indent?: boolean
}) {
  const toggle = useAction(setPageInNav)
  const move = useAction(movePage)
  const busy = toggle.pending || move.pending

  return (
    <li
      className={`flex items-center gap-3 py-2.5${indent ? " pl-5" : ""}`}
      data-pending={busy || undefined}
    >
      <Reorder
        isFirst={isFirst}
        isLast={isLast}
        pending={move.pending}
        onMove={(dir) => move.run(page.id, dir)}
        label={page.title}
        hide={indent}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {indent && (
            <span className="mr-1 select-none text-gray-300" aria-hidden>
              └{" "}
            </span>
          )}
          {page.title}
        </p>
        <p className="truncate font-mono text-xs text-gray-400">/pages/{page.slug}</p>
      </div>

      {!page.published && (
        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          Draft
        </span>
      )}

      <Toggle
        checked={page.showInNav}
        disabled={busy}
        onChange={(checked) => toggle.run(page.id, checked)}
      />
    </li>
  )
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
        transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand
        focus-visible:ring-offset-2 disabled:opacity-50
        ${checked ? "bg-brand" : "bg-gray-200"}`}
    >
      <span
        className={`pointer-events-none inline-block size-4 transform rounded-full bg-white
          shadow ring-0 transition duration-200 ease-in-out
          ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
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

function Reorder({
  isFirst,
  isLast,
  pending,
  onMove,
  label,
  hide,
}: {
  isFirst: boolean
  isLast: boolean
  pending: boolean
  onMove: (direction: "up" | "down") => void
  label: string
  hide?: boolean
}) {
  if (hide) {
    return <div className="w-5 shrink-0" />
  }

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
