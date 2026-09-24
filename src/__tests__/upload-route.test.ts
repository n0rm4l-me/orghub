import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({ get: () => null })),
}))

const mockGetCurrentUser = vi.fn()
vi.mock("@/lib/rbac", () => ({ getCurrentUser: mockGetCurrentUser }))

const mockUploadToStorage = vi.fn().mockResolvedValue("/uploads/media/fake.jpg")
vi.mock("@/lib/storage", () => ({ uploadToStorage: mockUploadToStorage }))

const mockDb = {
  media: { create: vi.fn().mockResolvedValue({ id: "media-1" }) },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

function formDataRequest(file: File, folder = "media") {
  const fd = new FormData()
  fd.set("file", file)
  fd.set("folder", folder)
  return new Request("http://localhost/api/upload", { method: "POST", body: fd })
}

describe("/api/upload", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects an unauthenticated request via getCurrentUser (not a raw session check)", async () => {
    // getCurrentUser re-checks the account is still active in the DB, unlike
    // a bare auth()/session read; asserting it's actually the function this
    // route calls guards against silently reverting to the weaker check.
    mockGetCurrentUser.mockResolvedValue(null)
    const { POST } = await import("@/app/api/upload/route")
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" })
    const res = await POST(formDataRequest(file))
    expect(res.status).toBe(401)
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
    expect(mockDb.media.create).not.toHaveBeenCalled()
  })

  it("rejects an SVG upload regardless of role", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u1", role: "ADMIN" })
    const { POST } = await import("@/app/api/upload/route")
    const file = new File(["<svg><script>alert(1)</script></svg>"], "x.svg", { type: "image/svg+xml" })
    const res = await POST(formDataRequest(file))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/unsupported/i)
    expect(mockUploadToStorage).not.toHaveBeenCalled()
    expect(mockDb.media.create).not.toHaveBeenCalled()
  })

  it("accepts a normal image upload for an authenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u1", role: "VIEWER" })
    const { POST } = await import("@/app/api/upload/route")
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" })
    const res = await POST(formDataRequest(file))
    expect(res.status).toBe(200)
    expect(mockDb.media.create).toHaveBeenCalledTimes(1)
  })
})
