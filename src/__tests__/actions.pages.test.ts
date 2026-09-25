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

const mockUniquePageSlug = vi.fn().mockResolvedValue("about-us")
vi.mock("@/lib/slug", () => ({ uniquePageSlug: mockUniquePageSlug }))

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  page: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
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

describe("pages actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("createPage", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { createPage } = await import("@/lib/actions/pages")
      await expect(createPage(formData({ title: "About" }))).rejects.toThrow(/REDIRECT/)
    })

    it("rejects an empty title", async () => {
      signInAs(USERS.editor)
      const { createPage } = await import("@/lib/actions/pages")
      const result = await createPage(formData({ title: "  " }))
      expect(result).toMatchObject({ ok: false, field: "title" })
      expect(mockDb.page.create).not.toHaveBeenCalled()
    })

    it("rejects unparseable body JSON instead of crashing", async () => {
      signInAs(USERS.editor)
      const { createPage } = await import("@/lib/actions/pages")
      const result = await createPage(formData({ title: "About", body: "{not json" }))
      expect(result).toMatchObject({ ok: false, field: "body" })
      expect(mockDb.page.create).not.toHaveBeenCalled()
    })

    it("defaults to an empty doc when no body is provided", async () => {
      signInAs(USERS.editor)
      mockDb.page.create.mockResolvedValue({ id: "p1", slug: "about-us" })
      const { createPage } = await import("@/lib/actions/pages")
      await createPage(formData({ title: "About" }))
      expect(mockDb.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ body: { type: "doc", content: [] } }),
        select: { id: true, slug: true },
      })
    })

    it("reports 'Draft saved' vs 'Page published' based on the published flag", async () => {
      signInAs(USERS.editor)
      mockDb.page.create.mockResolvedValue({ id: "p1", slug: "about-us" })
      const { createPage } = await import("@/lib/actions/pages")
      const draft = await createPage(formData({ title: "About" }))
      expect(draft).toMatchObject({ message: "Draft saved." })
      const published = await createPage(formData({ title: "About", published: "true" }))
      expect(published).toMatchObject({ message: "Page published." })
    })
  })

  describe("updatePage", () => {
    it("404s for a missing page", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce(null)
      const { updatePage } = await import("@/lib/actions/pages")
      const result = await updatePage("gone", formData({ title: "About" }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.page.update).not.toHaveBeenCalled()
    })

    it("keeps the existing slug when the title is unchanged", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ slug: "about-us", title: "About" })
      const { updatePage } = await import("@/lib/actions/pages")
      await updatePage("p1", formData({ title: "About" }))
      expect(mockUniquePageSlug).not.toHaveBeenCalled()
      expect(mockDb.page.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: expect.objectContaining({ slug: "about-us" }),
      })
    })

    it("regenerates the slug when the title changes, and revalidates the old slug too", async () => {
      const { revalidatePath } = await import("next/cache")
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ slug: "about-us", title: "About" })
      mockUniquePageSlug.mockResolvedValueOnce("about-the-team")
      const { updatePage } = await import("@/lib/actions/pages")
      await updatePage("p1", formData({ title: "About the team" }))
      expect(mockUniquePageSlug).toHaveBeenCalledWith("About the team", "p1")
      expect(mockDb.page.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: expect.objectContaining({ slug: "about-the-team" }),
      })
      expect(revalidatePath).toHaveBeenCalledWith("/pages/about-us")
    })
  })

  describe("deletePage", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { deletePage } = await import("@/lib/actions/pages")
      await expect(deletePage("p1")).rejects.toThrow(/REDIRECT/)
      expect(mockDb.page.delete).not.toHaveBeenCalled()
    })

    it("404s for a missing page", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce(null)
      const { deletePage } = await import("@/lib/actions/pages")
      const result = await deletePage("gone")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.page.delete).not.toHaveBeenCalled()
    })
  })

  describe("togglePagePublish", () => {
    it("404s for a missing page", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce(null)
      const { togglePagePublish } = await import("@/lib/actions/pages")
      const result = await togglePagePublish("gone", false)
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.page.update).not.toHaveBeenCalled()
    })

    it("flips the published flag and reports accordingly", async () => {
      signInAs(USERS.editor)
      mockDb.page.findUnique.mockResolvedValueOnce({ slug: "about-us", title: "About" })
      const { togglePagePublish } = await import("@/lib/actions/pages")
      const result = await togglePagePublish("p1", false)
      expect(result).toMatchObject({ ok: true, message: "Page is now live." })
      expect(mockDb.page.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { published: true } })
    })
  })
})
