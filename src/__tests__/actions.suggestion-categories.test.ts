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
  suggestionCategory: {
    findUnique: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
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

describe("suggestion-categories actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("createSuggestionCategory", () => {
    it("VIEWER is rejected (EDITOR-only)", async () => {
      signInAs(USERS.viewer)
      const { createSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      await expect(createSuggestionCategory(formData({ name: "Ops" }))).rejects.toThrow(/REDIRECT/)
    })

    it("rejects an empty name", async () => {
      signInAs(USERS.editor)
      const { createSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      const result = await createSuggestionCategory(formData({ name: "  " }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.suggestionCategory.create).not.toHaveBeenCalled()
    })

    it("rejects a name over 60 characters", async () => {
      signInAs(USERS.editor)
      const { createSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      const result = await createSuggestionCategory(formData({ name: "x".repeat(61) }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.suggestionCategory.create).not.toHaveBeenCalled()
    })

    it("rejects an exact-match duplicate name", async () => {
      signInAs(USERS.editor)
      mockDb.suggestionCategory.findUnique.mockResolvedValueOnce({ id: "existing" })
      const { createSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      const result = await createSuggestionCategory(formData({ name: "Ops" }))
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.suggestionCategory.create).not.toHaveBeenCalled()
    })

    it("creates the category", async () => {
      signInAs(USERS.editor)
      mockDb.suggestionCategory.findUnique.mockResolvedValueOnce(null)
      const { createSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      const result = await createSuggestionCategory(formData({ name: "Ops" }))
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.suggestionCategory.create).toHaveBeenCalledWith({ data: { name: "Ops" } })
    })
  })

  describe("deleteSuggestionCategory", () => {
    it("404s for a missing category", async () => {
      signInAs(USERS.editor)
      mockDb.suggestionCategory.findUnique.mockResolvedValueOnce(null)
      const { deleteSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      const result = await deleteSuggestionCategory("gone")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.suggestionCategory.delete).not.toHaveBeenCalled()
    })

    it("mentions how many suggestions lose the category, pluralized correctly", async () => {
      signInAs(USERS.editor)
      mockDb.suggestionCategory.findUnique.mockResolvedValueOnce({ name: "Ops", _count: { suggestions: 2 } })
      const { deleteSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      const result = await deleteSuggestionCategory("c1")
      expect(result).toMatchObject({ ok: true, message: expect.stringContaining("2 suggestions lost") })
    })

    it("omits the suggestion count when none are attached", async () => {
      signInAs(USERS.editor)
      mockDb.suggestionCategory.findUnique.mockResolvedValueOnce({ name: "Ops", _count: { suggestions: 0 } })
      const { deleteSuggestionCategory } = await import("@/lib/actions/suggestion-categories")
      const result = await deleteSuggestionCategory("c1")
      expect(result).toMatchObject({ ok: true, message: '"Ops" deleted.' })
    })
  })
})
