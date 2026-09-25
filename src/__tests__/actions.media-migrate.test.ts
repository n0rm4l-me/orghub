import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

const mockListStorageObjects = vi.fn().mockResolvedValue([])
const mockCopyStorageObject = vi.fn().mockResolvedValue(undefined)
const mockDeleteFromStorage = vi.fn().mockResolvedValue(undefined)
const mockUploadToStorage = vi.fn().mockResolvedValue("/uploads/avatars/x.jpg")
vi.mock("@/lib/storage", () => ({
  listStorageObjects: mockListStorageObjects,
  copyStorageObject: mockCopyStorageObject,
  deleteFromStorage: mockDeleteFromStorage,
  uploadToStorage: mockUploadToStorage,
}))

const mockGravatarUrl = vi.fn((email: string) => `https://gravatar.example/${email}`)
vi.mock("@/lib/gravatar", () => ({ gravatarUrl: mockGravatarUrl }))

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue({ id: "admin-1" }),
    update: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  dish: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  fixedMenuEntry: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  weekMenuEntry: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  monthlyTopic: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  monthlyTopicHighlight: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  siteSettings: { findFirst: vi.fn().mockResolvedValue(null) },
  article: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  media: {
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
  $executeRaw: vi.fn().mockResolvedValue(0),
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

type MockUser = { id: string; email: string; name: string; role: "VIEWER" | "ADMIN"; active: boolean; avatarUrl: null; locationId: null }
const USERS: Record<string, MockUser> = {
  viewer: { id: "u-viewer", email: "viewer@x.com", name: "Viewer", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  admin: { id: "u-admin", email: "admin@x.com", name: "Admin", role: "ADMIN", active: true, avatarUrl: null, locationId: null },
}
function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

describe("media-migrate actions", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllGlobals())

  describe("runMediaMigration", () => {
    it("VIEWER is rejected (ADMIN-only)", async () => {
      signInAs(USERS.viewer)
      const { runMediaMigration } = await import("@/lib/actions/media-migrate")
      await expect(runMediaMigration()).rejects.toThrow(/REDIRECT/)
    })

    it("reports zero moved/created when there is nothing unclassified", async () => {
      signInAs(USERS.admin)
      mockDb.media.findMany.mockResolvedValueOnce([])
      const { runMediaMigration } = await import("@/lib/actions/media-migrate")
      const result = await runMediaMigration()
      expect(result).toMatchObject({ ok: true, moved: 0, created: 0 })
    })

    it("only re-keys and moves storage when the classified context actually changes", async () => {
      signInAs(USERS.admin)
      mockDb.article.findMany.mockResolvedValueOnce([{ coverImage: "/uploads/media/cover.jpg" }])
      mockDb.media.findMany.mockResolvedValueOnce([
        { id: "m1", url: "/uploads/media/cover.jpg", key: "media/cover.jpg", mimeType: "image/jpeg", context: "media" },
      ])
      const { runMediaMigration } = await import("@/lib/actions/media-migrate")
      const result = await runMediaMigration()
      expect(result).toMatchObject({ moved: 1 })
      expect(mockCopyStorageObject).toHaveBeenCalledWith("media/cover.jpg", "articles/cover.jpg")
      expect(mockDb.media.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: { key: "articles/cover.jpg", url: "/uploads/articles/cover.jpg", context: "articles" },
      })
      expect(mockDeleteFromStorage).toHaveBeenCalledWith("media/cover.jpg")
    })

    it("skips a record whose classified context already matches, without touching storage", async () => {
      signInAs(USERS.admin)
      mockDb.article.findMany.mockResolvedValueOnce([{ coverImage: "/uploads/articles/cover.jpg" }])
      mockDb.media.findMany.mockResolvedValueOnce([
        { id: "m1", url: "/uploads/articles/cover.jpg", key: "articles/cover.jpg", mimeType: "image/jpeg", context: "articles" },
      ])
      const { runMediaMigration } = await import("@/lib/actions/media-migrate")
      const result = await runMediaMigration()
      expect(result).toMatchObject({ moved: 0 })
      expect(mockCopyStorageObject).not.toHaveBeenCalled()
      expect(mockDb.media.update).not.toHaveBeenCalled()
    })

    it("falls back to the generic 'media' context when a URL matches nothing", async () => {
      signInAs(USERS.admin)
      mockDb.media.findMany.mockResolvedValueOnce([
        { id: "m1", url: "/uploads/media/orphan.jpg", key: "media/orphan.jpg", mimeType: "image/jpeg", context: null },
      ])
      const { runMediaMigration } = await import("@/lib/actions/media-migrate")
      await runMediaMigration()
      // context was null, target is "media": same key (no rename needed), just sets context.
      expect(mockDb.media.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { context: "media" } })
      expect(mockCopyStorageObject).not.toHaveBeenCalled()
    })

    it("creates Media records for bare dining/ storage objects with no existing row", async () => {
      signInAs(USERS.admin)
      mockListStorageObjects.mockResolvedValueOnce([{ key: "dining/new-dish.jpg", size: 1234, lastModified: new Date() }])
      mockDb.media.findMany
        .mockResolvedValueOnce([]) // unclassified pass
        .mockResolvedValueOnce([]) // existing dining/ keys pass
      const { runMediaMigration } = await import("@/lib/actions/media-migrate")
      const result = await runMediaMigration()
      expect(result).toMatchObject({ created: 1 })
      expect(mockDb.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ key: "dining/new-dish.jpg", context: "dining", uploadedById: "admin-1" }),
      })
    })

    it("creates no records when no admin user exists to attribute them to", async () => {
      signInAs(USERS.admin)
      mockDb.user.findFirst.mockResolvedValueOnce(null)
      mockListStorageObjects.mockResolvedValueOnce([{ key: "dining/new-dish.jpg", size: 1234, lastModified: new Date() }])
      const { runMediaMigration } = await import("@/lib/actions/media-migrate")
      const result = await runMediaMigration()
      expect(result).toMatchObject({ created: 0 })
      expect(mockDb.media.create).not.toHaveBeenCalled()
    })
  })

  describe("cacheAllGravatars", () => {
    it("VIEWER is rejected (ADMIN-only)", async () => {
      signInAs(USERS.viewer)
      const { cacheAllGravatars } = await import("@/lib/actions/media-migrate")
      await expect(cacheAllGravatars()).rejects.toThrow(/REDIRECT/)
    })

    it("does nothing when Gravatars are disabled", async () => {
      signInAs(USERS.admin)
      mockDb.siteSettings.findFirst.mockResolvedValueOnce({ gravatarsEnabled: false })
      const { cacheAllGravatars } = await import("@/lib/actions/media-migrate")
      const result = await cacheAllGravatars()
      expect(result).toMatchObject({ ok: true, cached: 0, skipped: 0 })
      expect(mockDb.user.findMany).not.toHaveBeenCalled()
    })

    it("skips users with no email, caches users a fetch succeeds for", async () => {
      signInAs(USERS.admin)
      mockDb.siteSettings.findFirst.mockResolvedValueOnce({ gravatarsEnabled: true })
      mockDb.user.findMany.mockResolvedValueOnce([
        { id: "u1", email: "a@x.com", avatarUrl: null },
        { id: "u2", email: null, avatarUrl: null },
      ])
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
      vi.stubGlobal("fetch", fetchMock)
      const { cacheAllGravatars } = await import("@/lib/actions/media-migrate")
      const result = await cacheAllGravatars()
      expect(result).toMatchObject({ cached: 1, skipped: 1 })
      expect(mockDb.user.update).toHaveBeenCalledTimes(1)
      vi.unstubAllGlobals()
    })

    it("counts a failed fetch as skipped rather than throwing", async () => {
      signInAs(USERS.admin)
      mockDb.siteSettings.findFirst.mockResolvedValueOnce({ gravatarsEnabled: true })
      mockDb.user.findMany.mockResolvedValueOnce([{ id: "u1", email: "a@x.com", avatarUrl: null }])
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }))
      const { cacheAllGravatars } = await import("@/lib/actions/media-migrate")
      const result = await cacheAllGravatars()
      expect(result).toMatchObject({ cached: 0, skipped: 1 })
      vi.unstubAllGlobals()
    })
  })
})
