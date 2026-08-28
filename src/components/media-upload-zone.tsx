"use client"

import { useRef, useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/toaster"

interface Props {
  onUploaded?: (url: string) => void
  className?: string
}

export function MediaUploadZone({ onUploaded, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    let uploaded = 0
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.set("file", file)
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const data = await res.json()
        if (!res.ok) { toast.error(data.error ?? "Upload failed"); continue }
        uploaded++
        onUploaded?.(data.url)
      } catch {
        toast.error(`Failed to upload ${file.name}`)
      }
    }
    setUploading(false)
    if (uploaded > 0) {
      router.refresh()
    }
  }

  return (
    <div
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl
        border-2 border-dashed p-8 text-center transition
        ${dragging ? "border-brand bg-brand/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}
        ${className ?? ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? (
        <Loader2 className="size-8 animate-spin text-brand" />
      ) : (
        <Upload className="size-8 text-gray-300" />
      )}
      <p className="text-sm font-medium text-gray-600">
        {uploading ? "Uploading…" : "Drop files here or click to browse"}
      </p>
      <p className="text-xs text-gray-400">Images and PDFs up to 10 MB</p>
    </div>
  )
}
