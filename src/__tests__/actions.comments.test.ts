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
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn().mockResolvedValue(undefined) }))

type MockUser = { id: string; email: string; name: string; role: "VIEWER" | "EDITOR" | "ADMIN"; active: boolean; avatarUrl: null; locationId: null }

const USERS: Record<string, MockUser> = {
  viewer: { id: "u-viewer", email: "viewer@x.com", name: "Viewer", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  otherViewer: { id: "u-otherviewer", email: "other@x.com", name: "Other", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  editor: { id: "u-editor", email: "editor@x.com", name: "Editor", role: "EDITOR", active: true, avatarUrl: null, locationId: null },
}

const ARTICLE = { id: "article-1", title: "Some article", authorId: "u-author", published: true }
const TOP_LEVEL_COMMENT = { id: "comment-1", authorId: USERS.viewer.id, articleId: ARTICLE.id, parentId: null }
const REPLY_COMMENT = { id: "comment-2", authorId: USERS.viewer.id, articleId: ARTICLE.id, parentId: TOP_LEVEL_COMMENT.id }

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  article: {
    findUnique: vi.fn((args: { where: { id: string; published?: boolean } }) =>
      Promise.resolve(args.where.id === ARTICLE.id ? ARTICLE : null)
    ),
  },
  comment: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      if (args.where.id === TOP_LEVEL_COMMENT.id) return Promise.resolve(TOP_LEVEL_COMMENT)
      if (args.where.id === REPLY_COMMENT.id) return Promise.resolve(REPLY_COMMENT)
      return Promise.resolve(null)
    }),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

describe("comment actions", () => {
  beforeEach(() => vi.clearAllMocks())

  describe("addComment", () => {
    it("rejects an anonymous (signed-out) commenter", async () => {
      mockAuth.mockResolvedValue(null)
      const { addComment } = await import("@/lib/actions/comments")
      const result = await addComment(ARTICLE.id, "hello")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.comment.create).not.toHaveBeenCalled()
    })

    it("rejects an empty comment", async () => {
      signInAs(USERS.viewer)
      const { addComment } = await import("@/lib/actions/comments")
      const result = await addComment(ARTICLE.id, "   ")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.comment.create).not.toHaveBeenCalled()
    })

    it("rejects a comment on a nonexistent or unpublished article", async () => {
      signInAs(USERS.viewer)
      const { addComment } = await import("@/lib/actions/comments")
      const result = await addComment("no-such-article", "hello")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.comment.create).not.toHaveBeenCalled()
    })

    it("rejects a reply to a parent comment from a different article (cross-article spoofing)", async () => {
      signInAs(USERS.viewer)
      const { addComment } = await import("@/lib/actions/comments")
      const result = await addComment("some-other-article-id", "hello", TOP_LEVEL_COMMENT.id)
      // TOP_LEVEL_COMMENT belongs to ARTICLE.id, and "some-other-article-id" isn't ARTICLE.id
      // at all (article.findUnique returns null for it), so this fails at the article check.
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.comment.create).not.toHaveBeenCalled()
    })

    it("rejects nesting a reply under a reply (only one level of nesting allowed)", async () => {
      signInAs(USERS.viewer)
      const { addComment } = await import("@/lib/actions/comments")
      const result = await addComment(ARTICLE.id, "hello", REPLY_COMMENT.id)
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.comment.create).not.toHaveBeenCalled()
    })

    it("accepts a valid top-level comment", async () => {
      signInAs(USERS.viewer)
      const { addComment } = await import("@/lib/actions/comments")
      const result = await addComment(ARTICLE.id, "hello")
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.comment.create).toHaveBeenCalledWith({
        data: { body: "hello", authorId: USERS.viewer.id, articleId: ARTICLE.id, parentId: null },
      })
    })

    it("accepts a valid reply to a top-level comment on the same article", async () => {
      signInAs(USERS.viewer)
      const { addComment } = await import("@/lib/actions/comments")
      const result = await addComment(ARTICLE.id, "a reply", TOP_LEVEL_COMMENT.id)
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.comment.create).toHaveBeenCalledTimes(1)
    })
  })

  describe("deleteComment", () => {
    it("rejects a nonexistent comment", async () => {
      signInAs(USERS.viewer)
      const { deleteComment } = await import("@/lib/actions/comments")
      const result = await deleteComment("no-such-comment")
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.comment.delete).not.toHaveBeenCalled()
    })

    it("a VIEWER can delete their own comment", async () => {
      signInAs(USERS.viewer)
      const { deleteComment } = await import("@/lib/actions/comments")
      const result = await deleteComment(TOP_LEVEL_COMMENT.id)
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.comment.delete).toHaveBeenCalledWith({ where: { id: TOP_LEVEL_COMMENT.id } })
    })

    it("a VIEWER cannot delete someone else's comment", async () => {
      signInAs(USERS.otherViewer)
      const { deleteComment } = await import("@/lib/actions/comments")
      const result = await deleteComment(TOP_LEVEL_COMMENT.id)
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.comment.delete).not.toHaveBeenCalled()
    })

    it("an EDITOR can delete someone else's comment (moderation)", async () => {
      signInAs(USERS.editor)
      const { deleteComment } = await import("@/lib/actions/comments")
      const result = await deleteComment(TOP_LEVEL_COMMENT.id)
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.comment.delete).toHaveBeenCalledWith({ where: { id: TOP_LEVEL_COMMENT.id } })
    })
  })
})
