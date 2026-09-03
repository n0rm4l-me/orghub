"use client"

import { useRef, useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2, FolderSync, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/toaster"
import { runMediaMigration } from "@/lib/actions/media-migrate"
import { deleteOrphanedObjects, type OrphanedObject } from "@/lib/actions/media"

function useUploader() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    let ok = 0
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.set("file", file)
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error ?? `Failed: ${file.name}`); continue }
        ok++
      } catch {
        toast.error(`Failed: ${file.name}`)
      }
    }
    setUploading(false)
    if (ok > 0) router.refresh()
  }, [router])

  return { upload, uploading }
}

export function MediaUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading } = useUploader()

  return (
    <>
      <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" className="sr-only"
        onChange={(e) => upload(e.target.files)} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm
          font-medium text-white transition hover:brightness-95 active:brightness-90 disabled:opacity-60"
      >
        {uploading
          ? <Loader2 className="size-4 animate-spin" aria-hidden />
          : <Upload className="size-4" aria-hidden />}
        Upload
      </button>
    </>
  )
}

export function MediaMigrateButton() {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleMigrate() {
    startTransition(async () => {
      const res = await runMediaMigration()
      if (!res.ok) { toast.error(res.error ?? "Migration failed"); return }
      toast.success(`Migration done: moved ${res.moved ?? 0}, created ${res.created ?? 0} records`)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleMigrate}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm font-medium text-brand transition hover:bg-brand/10 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FolderSync className="size-4" />}
      Run Migration
    </button>
  )
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function OrphanedList({ orphans }: { orphans: OrphanedObject[] }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (orphans.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-sm text-gray-400">No orphaned objects. Storage is clean.</p>
    </div>
  )

  function handleDeleteAll() {
    if (!confirm(`Delete all ${orphans.length} orphaned object${orphans.length === 1 ? "" : "s"}?`)) return
    startTransition(async () => {
      const res = await deleteOrphanedObjects(orphans.map((o) => o.key))
      if (!res.ok) { toast.error(res.error ?? "Failed"); return }
      toast.success(res.message ?? "Deleted")
      router.refresh()
    })
  }

  function handleDeleteOne(key: string) {
    startTransition(async () => {
      const res = await deleteOrphanedObjects([key])
      if (!res.ok) { toast.error(res.error ?? "Failed"); return }
      router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm text-gray-500">{orphans.length} file{orphans.length === 1 ? "" : "s"}</span>
        <button
          type="button"
          onClick={handleDeleteAll}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          Delete all
        </button>
      </div>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
        {orphans.map((o) => {
          const name = o.key.split("/").pop() ?? o.key
          const isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(o.key)
          return (
            <div key={o.key} className="flex items-center gap-3 px-4 py-2.5">
              <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {isImage && (
                  <img src={`/uploads/${o.key}`} alt={name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{name}</p>
                <p className="text-xs text-gray-400">{o.key.split("/")[0]} · {formatBytes(o.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteOne(o.key)}
                disabled={pending}
                className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function GlobalDropZone() {
  const [active, setActive] = useState(false)
  const counter = useRef(0)
  const { upload, uploading } = useUploader()

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (!e.dataTransfer?.types.includes("Files")) return
      counter.current++
      setActive(true)
    }
    function onDragLeave() {
      counter.current = Math.max(0, counter.current - 1)
      if (counter.current === 0) setActive(false)
    }
    function onDragOver(e: DragEvent) { e.preventDefault() }
    function onDrop(e: DragEvent) {
      e.preventDefault()
      counter.current = 0
      setActive(false)
      upload(e.dataTransfer?.files ?? null)
    }

    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("drop", onDrop)
    }
  }, [upload])

  if (!active && !uploading) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center
      bg-brand/10 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand
        bg-white/90 px-16 py-12 shadow-xl">
        {uploading
          ? <Loader2 className="size-12 animate-spin text-brand" />
          : <Upload className="size-12 text-brand" />}
        <p className="text-base font-semibold text-gray-800">
          {uploading ? "Uploading…" : "Drop files to upload"}
        </p>
        <p className="text-sm text-gray-400">Images and PDFs up to 10 MB</p>
      </div>
    </div>
  )
}
