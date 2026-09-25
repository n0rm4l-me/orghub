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

type MockUser = { id: string; email: string; name: string; role: "VIEWER" | "EDITOR" | "ADMIN"; active: boolean; avatarUrl: null; locationId: null }

const USERS: Record<string, MockUser> = {
  viewer:  { id: "u-viewer",  email: "viewer@x.com",  name: "Viewer",  role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  otherViewer: { id: "u-otherviewer", email: "other@x.com", name: "Other", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  editor:  { id: "u-editor",  email: "editor@x.com",  name: "Editor",  role: "EDITOR", active: true, avatarUrl: null, locationId: null },
  admin:   { id: "u-admin",   email: "admin@x.com",   name: "Admin",   role: "ADMIN",  active: true, avatarUrl: null, locationId: null },
}

const OWNED_COMMENT = { id: "comment-1", authorId: USERS.viewer.id, suggestionId: "sugg-1" }

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  siteSettings: {
    findUniqueOrThrow: vi.fn().mockResolvedValue({ enabledModules: "suggestions,polls,kudos,dining" }),
  },
  suggestion: {
    delete: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue({ id: "sugg-1", title: "Idea", authorId: null }),
  },
  suggestionComment: {
    findUnique: vi.fn((args: { where: { id: string } }) =>
      Promise.resolve(args.where.id === OWNED_COMMENT.id ? OWNED_COMMENT : null)
    ),
    delete: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

describe("suggestions authorization", () => {
  beforeEach(() => vi.clearAllMocks())

  it("EDITOR is rejected from deleting a suggestion (ADMIN-only)", async () => {
    signInAs(USERS.editor)
    const { deleteSuggestion } = await import("@/lib/actions/suggestions")
    await expect(deleteSuggestion("sugg-1")).rejects.toThrow(/REDIRECT/)
    expect(mockDb.suggestion.delete).not.toHaveBeenCalled()
  })

  it("ADMIN can delete a suggestion", async () => {
    signInAs(USERS.admin)
    const { deleteSuggestion } = await import("@/lib/actions/suggestions")
    await expect(deleteSuggestion("sugg-1")).resolves.toMatchObject({ ok: true })
    expect(mockDb.suggestion.delete).toHaveBeenCalledWith({ where: { id: "sugg-1" } })
  })

  it("a VIEWER can delete their own comment", async () => {
    signInAs(USERS.viewer)
    const { deleteComment } = await import("@/lib/actions/suggestions")
    const result = await deleteComment(OWNED_COMMENT.id)
    expect(result).toMatchObject({ ok: true })
    expect(mockDb.suggestionComment.delete).toHaveBeenCalledWith({ where: { id: OWNED_COMMENT.id } })
  })

  it("a VIEWER cannot delete someone else's comment", async () => {
    signInAs(USERS.otherViewer)
    const { deleteComment } = await import("@/lib/actions/suggestions")
    const result = await deleteComment(OWNED_COMMENT.id)
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.suggestionComment.delete).not.toHaveBeenCalled()
  })

  it("an EDITOR can delete someone else's comment (role bypasses ownership)", async () => {
    signInAs(USERS.editor)
    const { deleteComment } = await import("@/lib/actions/suggestions")
    const result = await deleteComment(OWNED_COMMENT.id)
    expect(result).toMatchObject({ ok: true })
    expect(mockDb.suggestionComment.delete).toHaveBeenCalledWith({ where: { id: OWNED_COMMENT.id } })
  })

  it("a VIEWER's comment is not flagged as an admin reply", async () => {
    signInAs(USERS.viewer)
    const { addComment } = await import("@/lib/actions/suggestions")
    await expect(addComment("sugg-1", "just a thought")).resolves.toMatchObject({ ok: true })
    expect(mockDb.suggestionComment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isAdminReply: false }),
    })
  })

  it("an EDITOR's comment is flagged as an admin reply", async () => {
    signInAs(USERS.editor)
    const { addComment } = await import("@/lib/actions/suggestions")
    await expect(addComment("sugg-1", "official response")).resolves.toMatchObject({ ok: true })
    expect(mockDb.suggestionComment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isAdminReply: true }),
    })
  })
})
