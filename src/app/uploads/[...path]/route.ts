import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params
  const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000"
  const bucket = process.env.S3_BUCKET ?? "orghub"
  const url = `${endpoint}/${bucket}/${path.join("/")}`

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    return new NextResponse(null, { status: 502 })
  }

  if (!res.ok) return new NextResponse(null, { status: res.status })

  let body = Buffer.from(await res.arrayBuffer())
  let contentType = res.headers.get("Content-Type") ?? "application/octet-stream"

  const wParam = req.nextUrl.searchParams.get("w")
  const w = wParam ? parseInt(wParam, 10) : NaN
  if (!isNaN(w) && w > 0 && w <= 2000 && /^image\//i.test(contentType)) {
    try {
      const sharp = (await import("sharp")).default
      const img = sharp(body, { failOn: "none" })
      const meta = await img.metadata()
      if (meta.width && meta.width > w) {
        body = await img.rotate().resize({ width: w }).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
        contentType = "image/jpeg"
      }
    } catch {
      // sharp unavailable or failed — serve original
    }
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
