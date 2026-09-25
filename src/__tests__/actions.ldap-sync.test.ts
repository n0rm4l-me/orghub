import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({ get: () => null })),
}))
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, cache: (fn: unknown) => fn }
})

const mockAuth = vi.fn()
vi.mock("@/auth", () => ({ auth: mockAuth }))

const mockUploadToStorage = vi.fn().mockResolvedValue("/uploads/avatars/x.jpg")
vi.mock("@/lib/storage", () => ({ uploadToStorage: mockUploadToStorage }))

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("resized")),
  })),
}))

const mockBind = vi.fn().mockResolvedValue(undefined)
const mockSearch = vi.fn()
const mockUnbind = vi.fn().mockResolvedValue(undefined)
vi.mock("ldapts", () => ({
  Client: vi.fn().mockImplementation(() => ({
    bind: mockBind,
    search: mockSearch,
    unbind: mockUnbind,
  })),
}))

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

type MockUser = { id: string; email: string; name: string; role: "ADMIN"; active: boolean; avatarUrl: null; locationId: null }
const USERS: Record<string, MockUser> = {
  admin: { id: "u-admin", email: "admin@x.com", name: "Admin", role: "ADMIN", active: true, avatarUrl: null, locationId: null },
}
function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

const ENV_KEYS = ["LDAP_URL", "LDAP_BIND_DN", "LDAP_BIND_PASSWORD", "LDAP_USER_SEARCH_BASE"] as const
const savedEnv: Record<string, string | undefined> = {}

describe("syncAdPhotos", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of ENV_KEYS) { savedEnv[k] = process.env[k]; process.env[k] = `fake-${k}` }
  })
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  it("ADMIN role is required", async () => {
    mockAuth.mockResolvedValue({ user: { id: "someone-not-admin" } })
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    await expect(syncAdPhotos()).rejects.toThrow(/REDIRECT/)
  })

  it("returns all-zero without ever binding when LDAP env vars aren't configured", async () => {
    signInAs(USERS.admin)
    delete process.env.LDAP_URL
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    const result = await syncAdPhotos()
    expect(result).toEqual({ synced: 0, skipped: 0, failed: 0 })
    expect(mockBind).not.toHaveBeenCalled()
  })

  it("returns all-zero without binding when there are no LDAP-provisioned active users", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([])
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    const result = await syncAdPhotos()
    expect(result).toEqual({ synced: 0, skipped: 0, failed: 0 })
    expect(mockBind).not.toHaveBeenCalled()
  })

  it("only queries active, LDAP-provisioned users", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([])
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    await syncAdPhotos()
    expect(mockDb.user.findMany).toHaveBeenCalledWith({
      where: { provider: "ldap", active: true },
      select: { id: true, email: true },
    })
  })

  it("sanitizes LDAP filter metacharacters out of the email before searching", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "a(b)*c\\d@x.com" }])
    mockSearch.mockResolvedValueOnce({ searchEntries: [] })
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    await syncAdPhotos()
    expect(mockSearch).toHaveBeenCalledWith("fake-LDAP_USER_SEARCH_BASE", expect.objectContaining({
      filter: "(mail=abcd@x.com)",
    }))
  })

  it("counts a user with no matching directory entry as skipped", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "a@x.com" }])
    mockSearch.mockResolvedValueOnce({ searchEntries: [] })
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    const result = await syncAdPhotos()
    expect(result).toEqual({ synced: 0, skipped: 1, failed: 0 })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("counts a directory entry with no thumbnailPhoto as skipped", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "a@x.com" }])
    mockSearch.mockResolvedValueOnce({ searchEntries: [{}] })
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    const result = await syncAdPhotos()
    expect(result).toEqual({ synced: 0, skipped: 1, failed: 0 })
  })

  it("resizes and uploads a found photo, updates the user's avatarUrl, counts as synced", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "a@x.com" }])
    mockSearch.mockResolvedValueOnce({ searchEntries: [{ thumbnailPhoto: Buffer.from("jpeg-bytes") }] })
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    const result = await syncAdPhotos()
    expect(result).toEqual({ synced: 1, skipped: 0, failed: 0 })
    expect(mockUploadToStorage).toHaveBeenCalledWith("avatars/u1.jpg", expect.any(Buffer), "image/jpeg")
    expect(mockDb.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { avatarUrl: "/uploads/avatars/x.jpg" } })
  })

  it("counts a per-user search failure as failed but keeps processing the rest", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "bad@x.com" }, { id: "u2", email: "ok@x.com" }])
    mockSearch
      .mockRejectedValueOnce(new Error("ldap timeout"))
      .mockResolvedValueOnce({ searchEntries: [] })
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    const result = await syncAdPhotos()
    expect(result).toEqual({ synced: 0, skipped: 1, failed: 1 })
  })

  it("always unbinds, even if bind itself throws", async () => {
    signInAs(USERS.admin)
    mockDb.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "a@x.com" }])
    mockBind.mockRejectedValueOnce(new Error("bad credentials"))
    const { syncAdPhotos } = await import("@/lib/actions/ldap-sync")
    await expect(syncAdPhotos()).rejects.toThrow("bad credentials")
    expect(mockUnbind).toHaveBeenCalledTimes(1)
  })
})
