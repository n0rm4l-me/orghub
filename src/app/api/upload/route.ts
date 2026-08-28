import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { uploadToStorage } from "@/lib/storage"

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  const uuid = randomUUID()
  const key = `media/${uuid}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  let url: string
  try {
    url = await uploadToStorage(key, buffer, file.type)
  } catch (err) {
    console.error("Storage upload failed:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }

  const media = await db.media.create({
    data: {
      filename: file.name,
      key,
      url,
      mimeType: file.type,
      size: file.size,
      uploadedById: session.user.id,
    },
  })

  return NextResponse.json({ id: media.id, url, key, filename: file.name })
}
