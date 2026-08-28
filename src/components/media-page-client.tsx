"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/toaster"

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
