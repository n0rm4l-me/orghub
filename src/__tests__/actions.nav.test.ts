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
  page: {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  },
  quickLink: {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
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

describe("nav actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("setPageInNav", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { setPageInNav } = await import("@/lib/actions/nav")
      await expect(setPageInNav("p1", true)).rejects.toThrow(/REDIRECT/)
    })

    it("404s for a missing page", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce(null)
      const { setPageInNav } = await import("@/lib/actions/nav")
      const result = await setPageInNav("gone", true)
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.page.update).not.toHaveBeenCalled()
    })

    it("warns that an unpublished page won't appear in the menu yet", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ title: "Draft", published: false })
      const { setPageInNav } = await import("@/lib/actions/nav")
      const result = await setPageInNav("p1", true)
      expect(result).toMatchObject({ ok: true, message: expect.stringContaining("once it is published") })
    })

    it("confirms normally for a published page", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ title: "About", published: true })
      const { setPageInNav } = await import("@/lib/actions/nav")
      const result = await setPageInNav("p1", true)
      expect(result).toMatchObject({ ok: true, message: expect.stringContaining("added to the menu") })
    })
  })

  describe("movePage", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { movePage } = await import("@/lib/actions/nav")
      await expect(movePage("p1", "up")).rejects.toThrow(/REDIRECT/)
    })

    it("no-ops (ok, no writes) when already first and moving up", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ title: "First", parentId: null })
      mockDb.page.findMany.mockResolvedValueOnce([{ id: "p1", title: "First" }, { id: "p2", title: "Second" }])
      const { movePage } = await import("@/lib/actions/nav")
      const result = await movePage("p1", "up")
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.$transaction).not.toHaveBeenCalled()
    })

    it("no-ops when already last and moving down", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ title: "Second", parentId: null })
      mockDb.page.findMany.mockResolvedValueOnce([{ id: "p1", title: "First" }, { id: "p2", title: "Second" }])
      const { movePage } = await import("@/lib/actions/nav")
      const result = await movePage("p2", "down")
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.$transaction).not.toHaveBeenCalled()
    })

    it("swaps order with the previous sibling when moving up", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ title: "Second", parentId: null })
      mockDb.page.findMany.mockResolvedValueOnce([{ id: "p1", title: "First" }, { id: "p2", title: "Second" }])
      const { movePage } = await import("@/lib/actions/nav")
      const result = await movePage("p2", "up")
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
      expect(mockDb.page.update).toHaveBeenNthCalledWith(1, { where: { id: "p2" }, data: { order: 0 } })
      expect(mockDb.page.update).toHaveBeenNthCalledWith(2, { where: { id: "p1" }, data: { order: 1 } })
    })

    it("scopes reordering to siblings sharing the same parentId", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ title: "Child", parentId: "parent-1" })
      mockDb.page.findMany.mockResolvedValueOnce([{ id: "p1", title: "Child" }])
      const { movePage } = await import("@/lib/actions/nav")
      await movePage("p1", "up")
      expect(mockDb.page.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { parentId: "parent-1" } }))
    })
  })

  describe("createQuickLink", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { createQuickLink } = await import("@/lib/actions/nav")
      const fd = new FormData(); fd.set("label", "Docs"); fd.set("url", "https://x.com")
      await expect(createQuickLink(fd)).rejects.toThrow(/REDIRECT/)
    })

    it("rejects a javascript: URL", async () => {
      signInAs(USERS.editor)
      const { createQuickLink } = await import("@/lib/actions/nav")
      const fd = new FormData(); fd.set("label", "Docs"); fd.set("url", "javascript:alert(1)")
      const result = await createQuickLink(fd)
      expect(result).toMatchObject({ ok: false, field: "url" })
      expect(mockDb.quickLink.create).not.toHaveBeenCalled()
    })

    it("places a new link after the current highest order", async () => {
      signInAs(USERS.editor)
      mockDb.quickLink.findFirst.mockResolvedValueOnce({ order: 4 })
      mockDb.quickLink.create.mockResolvedValue({ id: "l1" })
      const { createQuickLink } = await import("@/lib/actions/nav")
      const fd = new FormData(); fd.set("label", "Docs"); fd.set("url", "https://x.com")
      await createQuickLink(fd)
      expect(mockDb.quickLink.create).toHaveBeenCalledWith({
        data: { label: "Docs", url: "https://x.com", order: 5 },
        select: { id: true },
      })
    })

    it("starts at order 0 when there are no existing links", async () => {
      signInAs(USERS.editor)
      mockDb.quickLink.findFirst.mockResolvedValueOnce(null)
      mockDb.quickLink.create.mockResolvedValue({ id: "l1" })
      const { createQuickLink } = await import("@/lib/actions/nav")
      const fd = new FormData(); fd.set("label", "Docs"); fd.set("url", "/internal")
      await createQuickLink(fd)
      expect(mockDb.quickLink.create).toHaveBeenCalledWith({
        data: { label: "Docs", url: "/internal", order: 0 },
        select: { id: true },
      })
    })
  })

  describe("deleteQuickLink", () => {
    it("404s for a missing link", async () => {
      signInAs(USERS.editor)
      mockDb.quickLink.findUnique.mockResolvedValueOnce(null)
      const { deleteQuickLink } = await import("@/lib/actions/nav")
      const result = await deleteQuickLink("gone")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.quickLink.delete).not.toHaveBeenCalled()
    })
  })
})
