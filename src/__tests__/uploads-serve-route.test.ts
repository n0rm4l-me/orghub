import { vi, describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const mockGetFromStorage = vi.fn()
const mockUploadToStorage = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/storage", () => ({
  getFromStorage: mockGetFromStorage,
  uploadToStorage: mockUploadToStorage,
}))

let metaResult: { width?: number; format?: string; hasAlpha?: boolean } = {}
const mockToBuffer = vi.fn().mockResolvedValue(Buffer.from("resized-bytes"))
const mockToFormat = vi.fn(() => ({ toBuffer: mockToBuffer }))
const mockJpeg = vi.fn(() => ({ toBuffer: mockToBuffer }))
const mockResize = vi.fn(() => ({ jpeg: mockJpeg, toFormat: mockToFormat }))
const mockRotate = vi.fn(() => ({ resize: mockResize }))
const mockMetadata = vi.fn(() => Promise.resolve(metaResult))
vi.mock("sharp", () => ({
  default: vi.fn(() => ({ metadata: mockMetadata, rotate: mockRotate })),
}))

function req(path: string, w?: string) {
  const url = `http://localhost/uploads/${path}${w ? `?w=${w}` : ""}`
  return { req: new NextRequest(url), params: Promise.resolve({ path: path.split("/") }) }
}

describe("/uploads/[...path]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaResult = {}
  })

  it("rejects a path-traversal segment", async () => {
    const { GET } = await import("@/app/uploads/[...path]/route")
    const r = new NextRequest("http://localhost/uploads/media/secret.txt")
    const res = await GET(r, { params: Promise.resolve({ path: ["media", "..", "secret.txt"] }) })
    expect(res.status).toBe(400)
    expect(mockGetFromStorage).not.toHaveBeenCalled()
  })

  it("404s when the object doesn't exist", async () => {
    mockGetFromStorage.mockResolvedValueOnce(null)
    const { GET } = await import("@/app/uploads/[...path]/route")
    const { req: r, params } = req("media/gone.png")
    const res = await GET(r, { params })
    expect(res.status).toBe(404)
  })

  it("serves a small image as-is with no resize requested", async () => {
    mockGetFromStorage.mockResolvedValueOnce(Buffer.from("original-bytes"))
    const { GET } = await import("@/app/uploads/[...path]/route")
    const { req: r, params } = req("media/photo.jpg")
    const res = await GET(r, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/jpeg")
    expect(mockMetadata).not.toHaveBeenCalled()
  })

  it("resizes and re-encodes a non-alpha image to JPEG, and caches the derivative", async () => {
    mockGetFromStorage.mockResolvedValueOnce(null) // no cached derivative
    mockGetFromStorage.mockResolvedValueOnce(Buffer.from("original-bytes"))
    metaResult = { width: 1200, format: "jpeg", hasAlpha: false }
    const { GET } = await import("@/app/uploads/[...path]/route")
    const { req: r, params } = req("media/photo.jpg", "400")
    const res = await GET(r, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/jpeg")
    expect(mockJpeg).toHaveBeenCalled()
    expect(mockToFormat).not.toHaveBeenCalled()
    expect(mockUploadToStorage).toHaveBeenCalledWith("_derived/w400/media/photo.jpg", expect.any(Buffer), "image/jpeg")
  })

  it("resizes a transparent PNG in its own format instead of flattening it to JPEG, and does not cache it", async () => {
    mockGetFromStorage.mockResolvedValueOnce(null)
    mockGetFromStorage.mockResolvedValueOnce(Buffer.from("original-bytes"))
    metaResult = { width: 1200, format: "png", hasAlpha: true }
    const { GET } = await import("@/app/uploads/[...path]/route")
    const { req: r, params } = req("media/logo.png", "400")
    const res = await GET(r, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/png")
    expect(mockToFormat).toHaveBeenCalledWith("png")
    expect(mockJpeg).not.toHaveBeenCalled()
    expect(mockUploadToStorage).not.toHaveBeenCalled()
  })

  it("serves the original unresized when the image is already smaller than the requested width", async () => {
    mockGetFromStorage.mockResolvedValueOnce(null)
    mockGetFromStorage.mockResolvedValueOnce(Buffer.from("original-bytes"))
    metaResult = { width: 200, format: "png", hasAlpha: true }
    const { GET } = await import("@/app/uploads/[...path]/route")
    const { req: r, params } = req("media/small.png", "400")
    const res = await GET(r, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/png")
    expect(mockToFormat).not.toHaveBeenCalled()
    expect(mockJpeg).not.toHaveBeenCalled()
  })

  it("returns a cached derivative directly without touching sharp", async () => {
    mockGetFromStorage.mockResolvedValueOnce(Buffer.from("cached-derivative"))
    const { GET } = await import("@/app/uploads/[...path]/route")
    const { req: r, params } = req("media/photo.jpg", "400")
    const res = await GET(r, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("image/jpeg")
    expect(mockMetadata).not.toHaveBeenCalled()
    expect(mockGetFromStorage).toHaveBeenCalledTimes(1)
  })
})
