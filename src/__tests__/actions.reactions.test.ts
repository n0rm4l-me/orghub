import { vi, describe, it, expect, beforeEach } from "vitest"

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
  article: { findUnique: vi.fn() },
  articleReaction: {
    findUnique: vi.fn(),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

type MockUser = { id: string; email: string; name: string; role: "VIEWER"; active: boolean; avatarUrl: null; locationId: null }
const USERS: Record<string, MockUser> = {
  viewer: { id: "u-viewer", email: "viewer@x.com", name: "Viewer", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
}
function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

describe("toggleReaction", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects an anonymous visitor", async () => {
    mockAuth.mockResolvedValue(null)
    const { toggleReaction } = await import("@/lib/actions/reactions")
    const result = await toggleReaction("a1")
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.articleReaction.create).not.toHaveBeenCalled()
  })

  it("404s reacting to an unpublished or missing article", async () => {
    signInAs(USERS.viewer)
    mockDb.articleReaction.findUnique.mockResolvedValueOnce(null)
    mockDb.article.findUnique.mockResolvedValueOnce(null)
    const { toggleReaction } = await import("@/lib/actions/reactions")
    const result = await toggleReaction("a1")
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.articleReaction.create).not.toHaveBeenCalled()
  })

  it("reacts (creates) when no existing reaction, after confirming the article exists and is published", async () => {
    signInAs(USERS.viewer)
    mockDb.articleReaction.findUnique.mockResolvedValueOnce(null)
    mockDb.article.findUnique.mockResolvedValueOnce({ id: "a1" })
    mockDb.articleReaction.count.mockResolvedValueOnce(5)
    const { toggleReaction } = await import("@/lib/actions/reactions")
    const result = await toggleReaction("a1")
    expect(result).toMatchObject({ ok: true, data: { liked: true, count: 5 } })
    expect(mockDb.article.findUnique).toHaveBeenCalledWith({ where: { id: "a1", published: true }, select: { id: true } })
    expect(mockDb.articleReaction.create).toHaveBeenCalledWith({ data: { articleId: "a1", userId: USERS.viewer.id } })
  })

  it("un-reacts (deletes) without re-checking the article, when a reaction already exists", async () => {
    signInAs(USERS.viewer)
    mockDb.articleReaction.findUnique.mockResolvedValueOnce({ articleId: "a1", userId: USERS.viewer.id })
    mockDb.articleReaction.count.mockResolvedValueOnce(4)
    const { toggleReaction } = await import("@/lib/actions/reactions")
    const result = await toggleReaction("a1")
    expect(result).toMatchObject({ ok: true, data: { liked: false, count: 4 } })
    expect(mockDb.article.findUnique).not.toHaveBeenCalled()
    expect(mockDb.articleReaction.delete).toHaveBeenCalledWith({
      where: { articleId_userId: { articleId: "a1", userId: USERS.viewer.id } },
    })
  })
})
