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

const mockUniqueArticleSlug = vi.fn().mockResolvedValue("some-slug")
vi.mock("@/lib/slug", () => ({ uniqueArticleSlug: mockUniqueArticleSlug }))

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  article: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
  articleTranslation: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
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

describe("articles actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("createArticle", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { createArticle } = await import("@/lib/actions/articles")
      await expect(createArticle(formData({ title: "News" }))).rejects.toThrow(/REDIRECT/)
    })

    it("rejects an empty title", async () => {
      signInAs(USERS.editor)
      const { createArticle } = await import("@/lib/actions/articles")
      const result = await createArticle(formData({ title: "" }))
      expect(result).toMatchObject({ ok: false, field: "title" })
      expect(mockDb.article.create).not.toHaveBeenCalled()
    })

    it("rejects an excerpt over 300 characters", async () => {
      signInAs(USERS.editor)
      const { createArticle } = await import("@/lib/actions/articles")
      const result = await createArticle(formData({ title: "News", excerpt: "x".repeat(301) }))
      expect(result).toMatchObject({ ok: false, field: "excerpt" })
    })

    it("rejects an event end date before the start date", async () => {
      signInAs(USERS.editor)
      const { createArticle } = await import("@/lib/actions/articles")
      const result = await createArticle(formData({
        title: "Meetup", eventDate: "2026-02-02T00:00:00Z", eventEndDate: "2026-02-01T00:00:00Z",
      }))
      expect(result).toMatchObject({ ok: false, field: "eventEndDate" })
    })

    it("sets publishedAt when creating as published, leaves it null for a draft", async () => {
      signInAs(USERS.editor)
      mockDb.article.create.mockResolvedValue({ id: "a1", slug: "news" })
      const { createArticle } = await import("@/lib/actions/articles")
      await createArticle(formData({ title: "News", published: "true" }))
      expect(mockDb.article.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ published: true, publishedAt: expect.any(Date) }),
      }))
      await createArticle(formData({ title: "Draft" }))
      expect(mockDb.article.create).toHaveBeenLastCalledWith(expect.objectContaining({
        data: expect.objectContaining({ published: false, publishedAt: null }),
      }))
    })

    it("attaches the category only when one is provided", async () => {
      signInAs(USERS.editor)
      mockDb.article.create.mockResolvedValue({ id: "a1", slug: "news" })
      const { createArticle } = await import("@/lib/actions/articles")
      await createArticle(formData({ title: "News", categoryId: "cat-1" }))
      expect(mockDb.article.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ categories: { create: { categoryId: "cat-1" } } }),
      }))
      await createArticle(formData({ title: "No category" }))
      expect(mockDb.article.create).toHaveBeenLastCalledWith(expect.objectContaining({
        data: expect.objectContaining({ categories: undefined }),
      }))
    })
  })

  describe("updateArticle", () => {
    it("404s for a missing article", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce(null)
      const { updateArticle } = await import("@/lib/actions/articles")
      const result = await updateArticle("gone", formData({ title: "News" }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.article.update).not.toHaveBeenCalled()
    })

    it("keeps the existing slug when the title is unchanged", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce({ id: "a1", slug: "news", title: "News", published: true, publishedAt: new Date("2026-01-01") })
      const { updateArticle } = await import("@/lib/actions/articles")
      await updateArticle("a1", formData({ title: "News" }))
      expect(mockUniqueArticleSlug).not.toHaveBeenCalled()
      expect(mockDb.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: expect.objectContaining({ slug: "news" }),
      })
    })

    it("preserves the original publishedAt when re-saving an already-published article", async () => {
      signInAs(USERS.editor)
      const originalDate = new Date("2026-01-01T00:00:00Z")
      mockDb.article.findUnique.mockResolvedValueOnce({ id: "a1", slug: "news", title: "News", published: true, publishedAt: originalDate })
      const { updateArticle } = await import("@/lib/actions/articles")
      await updateArticle("a1", formData({ title: "News", published: "true" }))
      expect(mockDb.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: expect.objectContaining({ publishedAt: originalDate }),
      })
    })

    it("clears the translation cache for the article on every edit", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce({ id: "a1", slug: "news", title: "News", published: false, publishedAt: null })
      const { updateArticle } = await import("@/lib/actions/articles")
      await updateArticle("a1", formData({ title: "News" }))
      expect(mockDb.articleTranslation.deleteMany).toHaveBeenCalledWith({ where: { articleId: "a1" } })
    })

    it("replaces the category association entirely rather than appending", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce({ id: "a1", slug: "news", title: "News", published: false, publishedAt: null })
      const { updateArticle } = await import("@/lib/actions/articles")
      await updateArticle("a1", formData({ title: "News", categoryId: "cat-2" }))
      expect(mockDb.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: expect.objectContaining({ categories: { deleteMany: {}, create: { categoryId: "cat-2" } } }),
      })
    })
  })

  describe("pinArticle", () => {
    it("refuses to pin an unpublished article", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce({ title: "Draft", published: false, pinned: false })
      const { pinArticle } = await import("@/lib/actions/articles")
      const result = await pinArticle("a1")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.article.update).not.toHaveBeenCalled()
    })

    it("toggles pinned on a published article", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce({ title: "News", published: true, pinned: false })
      const { pinArticle } = await import("@/lib/actions/articles")
      const result = await pinArticle("a1")
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.article.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { pinned: true } })
    })
  })

  describe("togglePublish", () => {
    it("assigns a fresh publishedAt the first time an article is published", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce({ slug: "news", title: "News", publishedAt: null })
      const { togglePublish } = await import("@/lib/actions/articles")
      await togglePublish("a1", false)
      expect(mockDb.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { published: true, publishedAt: expect.any(Date) },
      })
    })

    it("clears publishedAt when unpublishing", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce({ slug: "news", title: "News", publishedAt: new Date() })
      const { togglePublish } = await import("@/lib/actions/articles")
      await togglePublish("a1", true)
      expect(mockDb.article.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { published: false, publishedAt: null },
      })
    })
  })

  describe("deleteArticle", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { deleteArticle } = await import("@/lib/actions/articles")
      await expect(deleteArticle("a1")).rejects.toThrow(/REDIRECT/)
      expect(mockDb.article.delete).not.toHaveBeenCalled()
    })

    it("404s for a missing article", async () => {
      signInAs(USERS.editor)
      mockDb.article.findUnique.mockResolvedValueOnce(null)
      const { deleteArticle } = await import("@/lib/actions/articles")
      const result = await deleteArticle("gone")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.article.delete).not.toHaveBeenCalled()
    })
  })
})
