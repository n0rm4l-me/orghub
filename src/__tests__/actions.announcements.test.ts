import { vi, describe, it, expect, beforeEach } from "vitest"

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

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  announcement: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(mockDb)),
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

type MockUser = { id: string; email: string; name: string; role: "VIEWER" | "EDITOR" | "ADMIN"; active: boolean; avatarUrl: null; locationId: null }
const USERS: Record<string, MockUser> = {
  viewer: { id: "u-viewer", email: "viewer@x.com", name: "Viewer", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  editor: { id: "u-editor", email: "editor@x.com", name: "Editor", role: "EDITOR", active: true, avatarUrl: null, locationId: null },
}
function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}
function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe("announcements actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("createAnnouncement", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { createAnnouncement } = await import("@/lib/actions/announcements")
      await expect(createAnnouncement(formData({ message: "Hi" }))).rejects.toThrow(/REDIRECT/)
    })

    it("rejects an empty message", async () => {
      signInAs(USERS.editor)
      const { createAnnouncement } = await import("@/lib/actions/announcements")
      const result = await createAnnouncement(formData({ message: "  " }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.announcement.create).not.toHaveBeenCalled()
    })

    it("rejects a javascript: linkUrl", async () => {
      signInAs(USERS.editor)
      const { createAnnouncement } = await import("@/lib/actions/announcements")
      const result = await createAnnouncement(formData({ message: "Hi", linkUrl: "javascript:alert(1)" }))
      expect(result).toMatchObject({ ok: false, field: "linkUrl" })
      expect(mockDb.announcement.create).not.toHaveBeenCalled()
    })

    it("rejects an end time before the start time", async () => {
      signInAs(USERS.editor)
      const { createAnnouncement } = await import("@/lib/actions/announcements")
      const result = await createAnnouncement(formData({
        message: "Hi", showFrom: "2026-01-02T00:00:00Z", showUntil: "2026-01-01T00:00:00Z",
      }))
      expect(result).toMatchObject({ ok: false, field: "showUntil" })
    })

    it("deactivates every existing announcement before creating the new one", async () => {
      signInAs(USERS.editor)
      mockDb.announcement.create.mockResolvedValue({ id: "a-new" })
      const { createAnnouncement } = await import("@/lib/actions/announcements")
      const result = await createAnnouncement(formData({ message: "New banner" }))
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.announcement.updateMany).toHaveBeenCalledWith({ data: { active: false } })
      expect(mockDb.announcement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ message: "New banner", active: true }),
        select: { id: true },
      })
    })
  })

  describe("updateAnnouncement", () => {
    it("404s for a missing announcement", async () => {
      signInAs(USERS.editor)
      mockDb.announcement.findUnique.mockResolvedValue(null)
      const { updateAnnouncement } = await import("@/lib/actions/announcements")
      const result = await updateAnnouncement("gone", formData({ message: "Hi" }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.announcement.update).not.toHaveBeenCalled()
    })

    it("does not touch other announcements' active state", async () => {
      signInAs(USERS.editor)
      mockDb.announcement.findUnique.mockResolvedValue({ id: "a1" })
      const { updateAnnouncement } = await import("@/lib/actions/announcements")
      await updateAnnouncement("a1", formData({ message: "Edited" }))
      expect(mockDb.announcement.updateMany).not.toHaveBeenCalled()
    })
  })

  describe("toggleAnnouncementActive", () => {
    it("activating deactivates every other announcement first", async () => {
      signInAs(USERS.editor)
      mockDb.announcement.findUnique.mockResolvedValue({ active: false, message: "Hi" })
      const { toggleAnnouncementActive } = await import("@/lib/actions/announcements")
      const result = await toggleAnnouncementActive("a1")
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.announcement.updateMany).toHaveBeenCalledWith({ where: { id: { not: "a1" } }, data: { active: false } })
      expect(mockDb.announcement.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { active: true } })
    })

    it("deactivating does not touch other announcements", async () => {
      signInAs(USERS.editor)
      mockDb.announcement.findUnique.mockResolvedValue({ active: true, message: "Hi" })
      const { toggleAnnouncementActive } = await import("@/lib/actions/announcements")
      await toggleAnnouncementActive("a1")
      expect(mockDb.announcement.updateMany).not.toHaveBeenCalled()
      expect(mockDb.announcement.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { active: false } })
    })
  })

  describe("deleteAnnouncement", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { deleteAnnouncement } = await import("@/lib/actions/announcements")
      await expect(deleteAnnouncement("a1")).rejects.toThrow(/REDIRECT/)
      expect(mockDb.announcement.delete).not.toHaveBeenCalled()
    })

    it("404s for a missing announcement", async () => {
      signInAs(USERS.editor)
      mockDb.announcement.findUnique.mockResolvedValue(null)
      const { deleteAnnouncement } = await import("@/lib/actions/announcements")
      const result = await deleteAnnouncement("gone")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.announcement.delete).not.toHaveBeenCalled()
    })
  })
})
