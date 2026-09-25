import { vi, describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn: unknown) => fn),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const mockGetMobileUser = vi.fn()
vi.mock("@/lib/mobile-auth", () => ({ getMobileUser: mockGetMobileUser }))

const mockCreateNotification = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/notifications", () => ({ createNotification: mockCreateNotification }))

let settings: { enabledModules: string } = { enabledModules: "suggestions" }

const mockDb = {
  siteSettings: { findUniqueOrThrow: vi.fn(() => Promise.resolve(settings)) },
  suggestion: {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
  },
  suggestionVote: {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  },
  suggestionComment: { create: vi.fn() },
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

const USER = { id: "u1", name: "Ada", email: "ada@x.com", role: "VIEWER" as const, avatarUrl: null }

describe("/api/suggestions routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settings = { enabledModules: "suggestions" }
  })

  describe("GET /api/suggestions", () => {
    it("404s when the suggestions module is disabled", async () => {
      settings = { enabledModules: "" }
      const { GET } = await import("@/app/api/suggestions/route")
      const res = await GET(new NextRequest("http://localhost/api/suggestions"))
      expect(res.status).toBe(404)
      expect(mockDb.suggestion.findMany).not.toHaveBeenCalled()
    })

    it("rejects an invalid status filter", async () => {
      const { GET } = await import("@/app/api/suggestions/route")
      const res = await GET(new NextRequest("http://localhost/api/suggestions?status=NOT_REAL"))
      expect(res.status).toBe(400)
    })

    it("lists suggestions: anonymous hides the author, voted reflects the current user", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      mockDb.suggestion.findMany.mockResolvedValue([
        {
          id: "s1", title: "Idea", body: "Body", category: null, status: "OPEN",
          anonymous: true, createdAt: new Date("2026-01-01"),
          author: { id: "other", name: "Other" },
          _count: { votes: 2, comments: 1 },
          votes: [{ id: "v1" }],
        },
      ])
      mockDb.suggestion.count.mockResolvedValue(1)
      const { GET } = await import("@/app/api/suggestions/route")
      const res = await GET(new NextRequest("http://localhost/api/suggestions"))
      const data = await res.json()
      expect(data.rows[0].author).toBeNull()
      expect(data.rows[0].voted).toBe(true)
      expect(data.rows[0].voteCount).toBe(2)
    })
  })

  describe("POST /api/suggestions", () => {
    it("rejects unauthenticated", async () => {
      mockGetMobileUser.mockResolvedValue(null)
      const { POST } = await import("@/app/api/suggestions/route")
      const res = await POST(new NextRequest("http://localhost/api/suggestions", {
        method: "POST", body: JSON.stringify({ title: "x", body: "y" }),
      }))
      expect(res.status).toBe(401)
      expect(mockDb.suggestion.create).not.toHaveBeenCalled()
    })

    it("rejects an empty title", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      const { POST } = await import("@/app/api/suggestions/route")
      const res = await POST(new NextRequest("http://localhost/api/suggestions", {
        method: "POST", body: JSON.stringify({ title: "  ", body: "y" }),
      }))
      expect(res.status).toBe(400)
      expect(mockDb.suggestion.create).not.toHaveBeenCalled()
    })

    it("creates a suggestion; anonymous omits authorId", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      mockDb.suggestion.create.mockResolvedValue({ id: "new-1" })
      const { POST } = await import("@/app/api/suggestions/route")
      const res = await POST(new NextRequest("http://localhost/api/suggestions", {
        method: "POST", body: JSON.stringify({ title: "Idea", body: "Body", anonymous: true }),
      }))
      expect(res.status).toBe(201)
      expect(mockDb.suggestion.create).toHaveBeenCalledWith({
        data: { title: "Idea", body: "Body", authorId: null, anonymous: true },
        select: { id: true },
      })
    })
  })

  describe("GET /api/suggestions/[id]", () => {
    it("404s for a hidden or missing suggestion", async () => {
      mockDb.suggestion.findUnique.mockResolvedValue(null)
      const { GET } = await import("@/app/api/suggestions/[id]/route")
      const res = await GET(new NextRequest("http://localhost/api/suggestions/s1"), { params: Promise.resolve({ id: "s1" }) })
      expect(res.status).toBe(404)
    })
  })

  describe("POST /api/suggestions/[id]/vote", () => {
    it("rejects unauthenticated", async () => {
      mockGetMobileUser.mockResolvedValue(null)
      const { POST } = await import("@/app/api/suggestions/[id]/vote/route")
      const res = await POST(
        new NextRequest("http://localhost/api/suggestions/s1/vote", { method: "POST" }),
        { params: Promise.resolve({ id: "s1" }) },
      )
      expect(res.status).toBe(401)
    })

    it("404s voting on a suggestion that doesn't exist", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      mockDb.suggestionVote.findUnique.mockResolvedValue(null)
      mockDb.suggestion.findUnique.mockResolvedValue(null)
      const { POST } = await import("@/app/api/suggestions/[id]/vote/route")
      const res = await POST(
        new NextRequest("http://localhost/api/suggestions/s1/vote", { method: "POST" }),
        { params: Promise.resolve({ id: "s1" }) },
      )
      expect(res.status).toBe(404)
      expect(mockDb.suggestionVote.create).not.toHaveBeenCalled()
    })

    it("toggles a vote off when one already exists", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      mockDb.suggestionVote.findUnique.mockResolvedValue({ id: "vote-1" })
      mockDb.suggestionVote.count.mockResolvedValue(3)
      const { POST } = await import("@/app/api/suggestions/[id]/vote/route")
      const res = await POST(
        new NextRequest("http://localhost/api/suggestions/s1/vote", { method: "POST" }),
        { params: Promise.resolve({ id: "s1" }) },
      )
      const data = await res.json()
      expect(mockDb.suggestionVote.delete).toHaveBeenCalledWith({ where: { id: "vote-1" } })
      expect(data).toEqual({ voted: false, count: 3 })
    })
  })

  describe("POST /api/suggestions/[id]/comments", () => {
    it("rejects a too-long comment", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      const { POST } = await import("@/app/api/suggestions/[id]/comments/route")
      const res = await POST(
        new NextRequest("http://localhost/api/suggestions/s1/comments", { method: "POST", body: JSON.stringify({ body: "x".repeat(2001) }) }),
        { params: Promise.resolve({ id: "s1" }) },
      )
      expect(res.status).toBe(400)
      expect(mockDb.suggestionComment.create).not.toHaveBeenCalled()
    })

    it("creates a comment and notifies the author when someone else comments", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      mockDb.suggestion.findUnique.mockResolvedValue({ id: "s1", title: "Idea", authorId: "author-1" })
      mockDb.suggestionComment.create.mockResolvedValue({
        id: "c1", body: "Nice", isAdminReply: false, createdAt: new Date(), authorId: USER.id,
        author: { id: USER.id, name: "Ada", avatarUrl: null },
      })
      const { POST } = await import("@/app/api/suggestions/[id]/comments/route")
      const res = await POST(
        new NextRequest("http://localhost/api/suggestions/s1/comments", { method: "POST", body: JSON.stringify({ body: "Nice" }) }),
        { params: Promise.resolve({ id: "s1" }) },
      )
      expect(res.status).toBe(201)
      expect(mockCreateNotification).toHaveBeenCalledWith(
        "author-1", "suggestion_comment", "New comment on your idea", "Idea", "/suggestions/s1",
      )
    })

    it("does not notify when the author comments on their own suggestion", async () => {
      mockGetMobileUser.mockResolvedValue(USER)
      mockDb.suggestion.findUnique.mockResolvedValue({ id: "s1", title: "Idea", authorId: USER.id })
      mockDb.suggestionComment.create.mockResolvedValue({
        id: "c1", body: "Nice", isAdminReply: false, createdAt: new Date(), authorId: USER.id,
        author: { id: USER.id, name: "Ada", avatarUrl: null },
      })
      const { POST } = await import("@/app/api/suggestions/[id]/comments/route")
      await POST(
        new NextRequest("http://localhost/api/suggestions/s1/comments", { method: "POST", body: JSON.stringify({ body: "Nice" }) }),
        { params: Promise.resolve({ id: "s1" }) },
      )
      expect(mockCreateNotification).not.toHaveBeenCalled()
    })
  })
})
