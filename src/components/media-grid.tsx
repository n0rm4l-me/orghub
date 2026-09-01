"use client"

import { useState } from "react"
import { Copy, Check, Trash2, FileText } from "lucide-react"
import { useAction } from "@/lib/use-action"
import { deleteMediaBulk } from "@/lib/actions/media"
import { useRouter } from "next/navigation"

export type MediaItem = {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  createdAt: Date
  context: string | null
  uploadedBy: { name: string | null } | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function CopyIconButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
      title="Copy URL"
    >
      {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function MediaCard({
  item,
  selected,
  anySelected,
  onToggle,
}: {
  item: MediaItem
  selected: boolean
  anySelected: boolean
  onToggle: () => void
}) {
  const isImage = item.mimeType.startsWith("image/")

  return (
    <div
      onClick={onToggle}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition
        ${selected ? "border-brand ring-2 ring-brand/20" : "border-gray-200 hover:border-gray-300"} bg-white`}
    >
      {/* checkbox */}
      <div
        className={`absolute left-2 top-2 z-10 grid size-5 place-items-center rounded-md border-2 bg-white
          transition-opacity
          ${selected ? "border-brand opacity-100" : `border-gray-300 ${anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}`}
      >
        {selected && <Check className="size-3 text-brand" strokeWidth={3} />}
      </div>

      {/* thumbnail */}
      <div className="flex h-40 items-center justify-center bg-gray-50">
        {isImage ? (
          <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
        ) : (
          <FileText className="size-10 text-gray-300" />
        )}
      </div>

      {/* meta */}
      <div className="flex items-center justify-between gap-1 px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-800">{item.filename}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-gray-400">{formatBytes(item.size)}</p>
            {item.context && (
              <span className="rounded-full bg-brand/10 px-1.5 py-px text-[10px] font-medium text-brand">{item.context}</span>
            )}
          </div>
        </div>
        <CopyIconButton url={item.url} />
      </div>
    </div>
  )
}

export function MediaGrid({ items }: { items: MediaItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const { run, pending } = useAction(deleteMediaBulk)
  const router = useRouter()

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleBulkDelete() {
    const ids = [...selected]
    if (!confirm(`Delete ${ids.length} file${ids.length === 1 ? "" : "s"}?`)) return
    run(ids)
    setSelected(new Set())
    router.refresh()
  }

  const count = selected.size

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm text-gray-500">{count} selected</span>
        <button
          type="button"
          disabled={count === 0 || pending}
          onClick={handleBulkDelete}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm
            font-medium text-red-600 transition hover:bg-red-100 active:bg-red-200 disabled:opacity-30 disabled:cursor-default"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => setSelected(new Set())}
          className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm
            font-medium text-gray-600 transition hover:bg-gray-50 hover:border-gray-300
            disabled:opacity-30 disabled:cursor-default"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            anySelected={count > 0}
            onToggle={() => toggle(item.id)}
          />
        ))}
      </div>
    </div>
  )
}
