import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { uploadToStorage } from "@/lib/storage"
import { logAudit } from "@/lib/audit"

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
}

/**
 * Longest edge kept for uploaded photos. The widest place an image is shown is
 * a full-width topic banner, so this still covers a 2x display there while
 * cutting a typical 4000x3000 phone photo to about a tenth of the bytes.
 */
const MAX_EDGE = 1600

/** Formats that can be safely downscaled. GIF is excluded to keep animation. */
const RESIZABLE = new Set(["image/jpeg", "image/png", "image/webp"])

/**
 * Downscales an oversized photo, preserving its format so PNG diagrams and
 * screenshots stay lossless. Returns the original bytes unchanged when the
 * image is already small enough, when the format is not resizable, or when
 * sharp is unavailable: sharp reaches us as an optional dependency of Next,
 * and losing uploads entirely would be far worse than serving a large file.
 */
async function downscale(buffer: Buffer, contentType: string): Promise<Buffer> {
  if (!RESIZABLE.has(contentType)) return buffer
  try {
    const sharp = (await import("sharp")).default
    const image = sharp(buffer, { failOn: "none" })
    const { width, height } = await image.metadata()
    if (!width || !height || Math.max(width, height) <= MAX_EDGE) return buffer

    const resized = image.rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside" })
    const out =
      contentType === "image/png"  ? await resized.png({ compressionLevel: 9 }).toBuffer() :
      contentType === "image/webp" ? await resized.webp({ quality: 82 }).toBuffer() :
                                     await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    // A pathological source can grow on re-encode; never make things worse.
    return out.length < buffer.length ? out : buffer
  } catch (err) {
    console.error("Image downscale skipped:", err)
    return buffer
  }
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

  const ALLOWED_FOLDERS = new Set(["media", "dining", "avatars", "logos", "articles", "pages"])
  const folderParam = formData.get("folder") as string | null
  const folder = ALLOWED_FOLDERS.has(folderParam ?? "") ? folderParam! : "media"

  const uuid = randomUUID()
  const key = `${folder}/${uuid}.${ext}`
  const buffer = await downscale(Buffer.from(await file.arrayBuffer()), file.type)

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
      context: folder,
      // The stored size, not the uploaded one: downscaling may have shrunk it.
      size: buffer.length,
      uploadedById: session.user.id,
    },
  })

  await logAudit({ userId: session.user.id, action: "media.upload", resourceType: "Media", resourceId: media.id, metadata: { filename: file.name, context: folder } })
  revalidatePath("/admin/media")
  return NextResponse.json({ id: media.id, url, key, filename: file.name })
}
