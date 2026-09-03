import { NextRequest, NextResponse } from "next/server"
import { getFromStorage, uploadToStorage } from "@/lib/storage"

const CACHE_HEADERS = { "Content-Type": "", "Cache-Control": "public, max-age=31536000, immutable" }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
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
      const sharp = (await import("sharp")).default
      const img = sharp(body, { failOn: "none" })
      const meta = await img.metadata()
      if (meta.width && meta.width > w) {
        body = await img.rotate().resize({ width: w }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
        contentType = "image/jpeg"
        const derivedKey = `_derived/w${w}/${pathStr}`
        uploadToStorage(derivedKey, body, "image/jpeg").catch(() => {})
      }
    } catch {
      // sharp unavailable or failed — serve original
    }
  }

  return new NextResponse(new Uint8Array(body), { headers: { ...CACHE_HEADERS, "Content-Type": contentType } })
}
