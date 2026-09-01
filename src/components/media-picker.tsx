"use client"

import { useRef, useState, useEffect } from "react"
import { X, Upload, Loader2, Images } from "lucide-react"
import { SafeImg } from "@/components/dining/safe-img"
import { toast } from "@/components/ui/toaster"
import { getMediaList } from "@/lib/actions/media"

type MediaItem = { id: string; url: string; filename: string; mimeType: string }

function MediaBrowsePanel({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMediaList(1, "").then((r) =>
      setItems(r.rows.filter((m) => m.mimeType.startsWith("image/")))
    )
  }, [])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [onClose])

  const filtered = (items ?? []).filter((m) =>
    m.filename.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div ref={ref} className="absolute right-0 top-full z-30 mt-1 w-72 rounded-xl border border-gray-200
      bg-white shadow-xl">
      <div className="border-b border-gray-100 px-2 py-1.5">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search images…"
          className="w-full rounded px-2 py-1 text-xs outline-none placeholder:text-gray-400 focus:bg-gray-50"
        />
      </div>
      {!items ? (
        <p className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-gray-400">
          <Loader2 className="size-3.5 animate-spin" /> Loading…
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400">
          {query ? "No matches." : "No images uploaded yet."}
        </p>
      ) : (
        <div className="grid max-h-56 grid-cols-3 gap-1 overflow-y-auto p-2">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onPick(m.url); onClose() }}
              title={m.filename}
              className="overflow-hidden rounded border border-gray-100 hover:border-brand transition"
            >
              <img src={m.url} alt={m.filename} className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  value: string
  onChange: (url: string) => void
  name?: string
  label?: string
  folder?: string
}

export function MediaPicker({ value, onChange, name = "photo", label = "Image", folder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.set("file", file)
    if (folder) fd.set("folder", folder)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return }
      onChange(data.url)
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-medium text-gray-700">{label}</p>}
      <input type="hidden" name={name} value={value} />
      <input ref={inputRef} type="file" accept="image/*" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {value ? (
        <div className="relative w-full overflow-hidden rounded-lg border border-gray-200"
          style={{ aspectRatio: "16/9" }}>
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button type="button" onClick={() => onChange("")}
            className="absolute right-2 top-2 grid size-6 place-items-center rounded-full
              bg-black/60 text-white hover:bg-red-600 transition">
            <X className="size-3.5" />
          </button>
          <button type="button" onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs
              font-medium text-white hover:bg-black/80 transition">
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragging(false)
              const f = e.dataTransfer.files[0]; if (f) handleFile(f)
            }}
            className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2
              rounded-lg border-2 border-dashed transition
              ${dragging ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
            style={{ aspectRatio: "16/9" }}
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin text-brand" />
            ) : (
              <>
                <Upload className="size-5 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {dragging ? "Drop to upload" : "Click or drag an image here"}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setBrowseOpen((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-brand transition"
          >
            <Images className="size-3.5" />
            Browse uploaded
          </button>
          {browseOpen && (
            <MediaBrowsePanel onPick={onChange} onClose={() => setBrowseOpen(false)} />
          )}
        </div>
      )}
    </div>
  )
}

export function MediaPickerField({ value, onChange, tone }: { value: string; onChange: (url: string) => void; tone?: "dark" }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.set("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) onChange(data.url)
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <SafeImg src={value} alt=""
          className={`h-9 w-[80px] rounded border object-contain p-1 ${tone === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}
          placeholderClassName={`h-9 w-[80px] rounded border ${tone === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`} />
        <button type="button" onClick={() => onChange("")}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-red-200 hover:text-red-500 transition">
          Remove
        </button>
        <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition">
          <input type="file" accept="image/*,image/svg+xml" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          Change
        </label>
      </div>
    )
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-200
      px-4 py-2.5 text-xs text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 w-fit">
      <input type="file" accept="image/*,image/svg+xml" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {uploading
        ? <Loader2 className="size-3.5 animate-spin text-brand" />
        : <Upload className="size-3.5" />}
      Upload image
    </label>
  )
}
