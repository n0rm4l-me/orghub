import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: unknown) => fn),
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

const mockDeleteFromStorage = vi.fn().mockResolvedValue(undefined)
const mockListStorageObjects = vi.fn().mockResolvedValue([])
vi.mock("@/lib/storage", () => ({
  deleteFromStorage: mockDeleteFromStorage,
  listStorageObjects: mockListStorageObjects,
}))

type MockUser = { id: string; email: string; name: string; role: "VIEWER" | "EDITOR" | "ADMIN"; active: boolean; avatarUrl: null; locationId: null }

const USERS: Record<string, MockUser> = {
  viewer: { id: "u-viewer", email: "viewer@x.com", name: "Viewer", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  editor: { id: "u-editor", email: "editor@x.com", name: "Editor", role: "EDITOR", active: true, avatarUrl: null, locationId: null },
  admin: { id: "u-admin", email: "admin@x.com", name: "Admin", role: "ADMIN", active: true, avatarUrl: null, locationId: null },
}

const MEDIA_ROW = { key: "media/pic.png", url: "/uploads/media/pic.png" }

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  media: {
    findMany: vi.fn().mockResolvedValue([MEDIA_ROW]),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  article: {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    update: vi.fn().mockResolvedValue({}),
  },
  page: {
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  dish: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  fixedMenuEntry: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  weekMenuEntry: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  monthlyTopic: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  monthlyTopicHighlight: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  siteSettings: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
}
// db.user is reused for both auth lookups and the media bulk-delete's own
// user.updateMany (avatarUrl cleanup) -- add updateMany onto the same mock.
;(mockDb.user as unknown as { updateMany: ReturnType<typeof vi.fn> }).updateMany = vi.fn().mockResolvedValue({ count: 0 })

vi.mock("@/lib/db", () => ({ db: mockDb }))

function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

describe("media actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("deleteMediaBulk", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { deleteMediaBulk } = await import("@/lib/actions/media")
      await expect(deleteMediaBulk(["m1"])).rejects.toThrow(/REDIRECT/)
      expect(mockDb.media.deleteMany).not.toHaveBeenCalled()
    })

    it("rejects an empty selection without touching the DB or storage", async () => {
      signInAs(USERS.editor)
      const { deleteMediaBulk } = await import("@/lib/actions/media")
      const result = await deleteMediaBulk([])
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.media.deleteMany).not.toHaveBeenCalled()
      expect(mockDeleteFromStorage).not.toHaveBeenCalled()
    })

    it("EDITOR can bulk-delete: removes storage objects, nulls every reference, deletes the rows", async () => {
      signInAs(USERS.editor)
      const { deleteMediaBulk } = await import("@/lib/actions/media")
      const result = await deleteMediaBulk(["m1"])
      expect(result).toMatchObject({ ok: true })
      expect(mockDeleteFromStorage).toHaveBeenCalledWith(MEDIA_ROW.key)
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
      expect(mockDb.article.updateMany).toHaveBeenCalledWith({
        where: { coverImage: { in: [MEDIA_ROW.url] } },
        data: { coverImage: null },
      })
      expect(mockDb.media.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["m1"] } } })
    })

    it("also strips matching image nodes out of Article/Page rich-text bodies", async () => {
      signInAs(USERS.editor)
      const paragraph = { type: "paragraph", content: [{ type: "text", text: "keep me" }] }
      const bodyWithMatch = {
        type: "doc",
        content: [paragraph, { type: "image", attrs: { src: MEDIA_ROW.url } }],
      }
      mockDb.article.findMany.mockResolvedValueOnce([{ id: "a1", body: bodyWithMatch }])
      mockDb.page.findMany.mockResolvedValueOnce([{ id: "p1", body: bodyWithMatch }])
      const { deleteMediaBulk } = await import("@/lib/actions/media")
      const result = await deleteMediaBulk(["m1"])
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { body: { type: "doc", content: [paragraph] } },
      })
      expect(mockDb.page.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { body: { type: "doc", content: [paragraph] } },
      })
    })

    it("leaves Article/Page bodies untouched when no image node references a deleted URL", async () => {
      signInAs(USERS.editor)
      const unrelatedBody = { type: "doc", content: [{ type: "image", attrs: { src: "/uploads/other.png" } }] }
      mockDb.article.findMany.mockResolvedValueOnce([{ id: "a1", body: unrelatedBody }])
      const { deleteMediaBulk } = await import("@/lib/actions/media")
      const result = await deleteMediaBulk(["m1"])
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.article.update).not.toHaveBeenCalled()
      expect(mockDb.page.update).not.toHaveBeenCalled()
    })
  })

  describe("deleteOrphanedObjects", () => {
    it("VIEWER is rejected (ADMIN-only)", async () => {
      signInAs(USERS.viewer)
      const { deleteOrphanedObjects } = await import("@/lib/actions/media")
      await expect(deleteOrphanedObjects(["k1"])).rejects.toThrow(/REDIRECT/)
    })

    it("EDITOR is rejected (ADMIN-only, stricter than the bulk-delete above)", async () => {
      signInAs(USERS.editor)
      const { deleteOrphanedObjects } = await import("@/lib/actions/media")
      await expect(deleteOrphanedObjects(["k1"])).rejects.toThrow(/REDIRECT/)
      expect(mockDb.media.deleteMany).not.toHaveBeenCalled()
    })

    it("rejects an empty key list", async () => {
      signInAs(USERS.admin)
      const { deleteOrphanedObjects } = await import("@/lib/actions/media")
      const result = await deleteOrphanedObjects([])
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.media.deleteMany).not.toHaveBeenCalled()
    })

    it("ADMIN can delete orphaned objects", async () => {
      signInAs(USERS.admin)
      const { deleteOrphanedObjects } = await import("@/lib/actions/media")
      const result = await deleteOrphanedObjects(["k1", "k2"])
      expect(result).toMatchObject({ ok: true })
      expect(mockDeleteFromStorage).toHaveBeenCalledWith("k1")
      expect(mockDeleteFromStorage).toHaveBeenCalledWith("k2")
      expect(mockDb.media.deleteMany).toHaveBeenCalledWith({ where: { key: { in: ["k1", "k2"] } } })
    })
  })
})
