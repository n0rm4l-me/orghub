import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/lib/rbac"
import { db } from "@/lib/db"
import { uploadToStorage } from "@/lib/storage"
import { logAudit } from "@/lib/audit"

const MAX_BYTES = 10 * 1024 * 1024  // 10 MB
// No SVG: served inline with no sanitization, an uploaded <script> executes
// on direct navigation to its /uploads URL under the app's own origin.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
  "image/gif":  "gif",
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

type Dimensions = { width: number | null; height: number | null }

/**
 * EXIF orientation 5-8 means the stored pixel grid is rotated 90 degrees
 * from how it's actually displayed (browsers honor EXIF orientation by
 * default). sharp's plain `metadata()` always reports the raw, un-rotated
 * grid, so width/height need swapping here for anything not going through
 * the `.rotate()` call below (which normalizes real pixels, and so needs no
 * such swap on its own output).
 */
function orientedDimensions(width?: number, height?: number, orientation?: number): Dimensions {
  if (!width || !height) return { width: null, height: null }
  return orientation && orientation >= 5 ? { width: height, height: width } : { width, height }
}

/**
 * Downscales an oversized photo, preserving its format so PNG diagrams and
 * screenshots stay lossless. Returns the original bytes unchanged when the
 * image is already small enough, when the format is not resizable, or when
 * sharp is unavailable: sharp reaches us as an optional dependency of Next,
 * and losing uploads entirely would be far worse than serving a large file.
 * Also returns the image's intrinsic dimensions (null if they can't be
 * determined) so callers can persist them for later layout-shift-free
 * rendering, regardless of whether any resizing actually happened.
 */
async function downscale(
  buffer: Buffer,
  contentType: string,
): Promise<{ buffer: Buffer } & Dimensions> {
  if (!RESIZABLE.has(contentType)) return { buffer, width: null, height: null }
  try {
    const sharp = (await import("sharp")).default
    const image = sharp(buffer, { failOn: "none" })
    const meta = await image.metadata()
    const { width, height } = orientedDimensions(meta.width, meta.height, meta.orientation)
    if (!width || !height || Math.max(width, height) <= MAX_EDGE) return { buffer, width, height }

    const resized = image.rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside" })
    const out =
      contentType === "image/png"  ? await resized.png({ compressionLevel: 9 }).toBuffer() :
      contentType === "image/webp" ? await resized.webp({ quality: 82 }).toBuffer() :
                                     await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    // A pathological source can grow on re-encode; never make things worse.
    if (out.length >= buffer.length) return { buffer, width, height }
    const finalMeta = await sharp(out).metadata()
    return { buffer: out, width: finalMeta.width ?? width, height: finalMeta.height ?? height }
  } catch (err) {
    console.error("Image downscale skipped:", err)
    return { buffer, width: null, height: null }
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
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
  const { buffer, width, height } = await downscale(Buffer.from(await file.arrayBuffer()), file.type)

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
      width,
      height,
      uploadedById: user.id,
    },
  })

  await logAudit({ userId: user.id, action: "media.upload", resourceType: "Media", resourceId: media.id, metadata: { filename: file.name, context: folder } })
  revalidatePath("/admin/media")
  return NextResponse.json({ id: media.id, url, key, filename: file.name, width, height })
}
