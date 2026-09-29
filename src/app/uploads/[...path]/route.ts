import { NextRequest, NextResponse } from "next/server"
import { getFromStorage, uploadToStorage } from "@/lib/storage"

const CACHE_HEADERS = { "Content-Type": "", "Cache-Control": "public, max-age=31536000, immutable" }

// A pathological source file can make sharp hang rather than throw (seen
// live: one specific upload stalled every ?w= request indefinitely, with
// the un-resized original serving fine since that path never touches
// sharp). No await below is otherwise bounded, so a single bad file would
// tie up a request -- and its connection -- forever. Anything past this
// falls through to the existing catch and serves the original.
const RESIZE_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

/** Returns null when the source is already narrower than `w` (nothing to do). */
async function resize(buffer: Buffer, w: number, derivedKey: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sharp = (await import("sharp")).default
  const img = sharp(buffer, { failOn: "none" })
  const meta = await img.metadata()
  if (!meta.width || meta.width <= w) return null

  if (meta.hasAlpha) {
    // Re-encoding to JPEG below would silently flatten transparency (a
    // resized logo/icon PNG would gain a black or white background
    // depending on the viewer). Resize but keep the source's own format
    // instead. Deliberately not written to the _derived/ cache: every
    // cache-hit response above hardcodes Content-Type: image/jpeg, so a
    // non-JPEG entry there would serve with the wrong header next time.
    const out = await img.rotate().resize({ width: w }).toFormat(meta.format ?? "png").toBuffer()
    return { buffer: out, contentType: `image/${meta.format ?? "png"}` }
  }

  const out = await img.rotate().resize({ width: w }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
  uploadToStorage(derivedKey, out, "image/jpeg").catch(() => {})
  return { buffer: out, contentType: "image/jpeg" }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  // Defense in depth: reject traversal segments outright rather than relying
  // on Next's own routing or the storage backend to have already normalized
  // them, since neither is guaranteed here.
  if (path.some((segment) => segment === ".." || segment.includes("\0"))) {
    return new NextResponse(null, { status: 400 })
  }
  const pathStr = path.join("/")
  const wParam = req.nextUrl.searchParams.get("w")
  const w = wParam ? parseInt(wParam, 10) : NaN
  const hasResize = !isNaN(w) && w > 0 && w <= 2000

  if (hasResize) {
    const derivedKey = `_derived/w${w}/${pathStr}`
    const cached = await getFromStorage(derivedKey)
    if (cached) {
      return new NextResponse(new Uint8Array(cached), { headers: { ...CACHE_HEADERS, "Content-Type": "image/jpeg" } })
    }
  }

  const raw = await getFromStorage(pathStr)
  if (!raw) return new NextResponse(null, { status: 404 })

  let body = raw
  const ext = pathStr.split(".").pop()?.toLowerCase() ?? ""
  const MIME: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", svg: "image/svg+xml",
    pdf: "application/pdf",
  }
  let contentType = MIME[ext] ?? "application/octet-stream"

  if (hasResize && /^image\//i.test(contentType)) {
    try {
      const derivedKey = `_derived/w${w}/${pathStr}`
      const resized = await withTimeout(resize(body, w, derivedKey), RESIZE_TIMEOUT_MS)
      if (resized) {
        body = resized.buffer
        contentType = resized.contentType
      }
    } catch {
      // sharp unavailable, failed, or timed out: serve original
    }
  }

  return new NextResponse(new Uint8Array(body), { headers: { ...CACHE_HEADERS, "Content-Type": contentType } })
}
