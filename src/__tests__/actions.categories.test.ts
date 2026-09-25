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

const mockUniqueCategorySlug = vi.fn().mockResolvedValue("some-slug")
vi.mock("@/lib/slug", () => ({ uniqueCategorySlug: mockUniqueCategorySlug }))

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  category: {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn().mockResolvedValue({}),
  },
  categoriesOnArticles: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
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
function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe("categories actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("createCategory", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { createCategory } = await import("@/lib/actions/categories")
      await expect(createCategory(formData({ name: "Eng" }))).rejects.toThrow(/REDIRECT/)
    })

    it("rejects an empty name", async () => {
      signInAs(USERS.editor)
      const { createCategory } = await import("@/lib/actions/categories")
      const result = await createCategory(formData({ name: "  " }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.category.create).not.toHaveBeenCalled()
    })

    it("rejects a case-insensitive duplicate name", async () => {
      signInAs(USERS.editor)
      mockDb.category.findFirst.mockResolvedValueOnce({ id: "existing" })
      const { createCategory } = await import("@/lib/actions/categories")
      const result = await createCategory(formData({ name: "engineering" }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.category.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: "engineering", mode: "insensitive" } },
        select: { id: true },
      })
      expect(mockDb.category.create).not.toHaveBeenCalled()
    })

    it("creates the category with a unique slug", async () => {
      signInAs(USERS.editor)
      mockDb.category.create.mockResolvedValue({ id: "c1" })
      const { createCategory } = await import("@/lib/actions/categories")
      const result = await createCategory(formData({ name: "Engineering" }))
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.category.create).toHaveBeenCalledWith({ data: { name: "Engineering", slug: "some-slug" }, select: { id: true } })
    })
  })

  describe("deleteCategory", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { deleteCategory } = await import("@/lib/actions/categories")
      await expect(deleteCategory("c1")).rejects.toThrow(/REDIRECT/)
      expect(mockDb.category.delete).not.toHaveBeenCalled()
    })

    it("404s for a missing category", async () => {
      signInAs(USERS.editor)
      mockDb.category.findUnique.mockResolvedValue(null)
      const { deleteCategory } = await import("@/lib/actions/categories")
      const result = await deleteCategory("gone")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.category.delete).not.toHaveBeenCalled()
    })

    it("detaches join-table rows before deleting the category, in one transaction", async () => {
      signInAs(USERS.editor)
      mockDb.category.findUnique.mockResolvedValue({ name: "Eng", _count: { articles: 3 } })
      const { deleteCategory } = await import("@/lib/actions/categories")
      const result = await deleteCategory("c1")
      expect(result).toMatchObject({ ok: true, message: expect.stringContaining("3 articles") })
      expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
      expect(mockDb.categoriesOnArticles.deleteMany).toHaveBeenCalledWith({ where: { categoryId: "c1" } })
    })

    it("uses singular wording for exactly one detached article", async () => {
      signInAs(USERS.editor)
      mockDb.category.findUnique.mockResolvedValue({ name: "Eng", _count: { articles: 1 } })
      const { deleteCategory } = await import("@/lib/actions/categories")
      const result = await deleteCategory("c1")
      expect(result).toMatchObject({ message: expect.stringContaining("1 article") })
      expect((result as { message: string }).message).not.toContain("1 articles")
    })
  })
})
