import { vi, describe, it, expect, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn: unknown) => fn),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const mockGetMobileUser = vi.fn()
vi.mock("@/lib/mobile-auth", () => ({ getMobileUser: mockGetMobileUser }))

const mockTranslate = vi.fn((text: string, target: string) => Promise.resolve(`[${target}] ${text}`))
vi.mock("@/lib/translation", () => ({
  getProvider: () => ({ translate: mockTranslate }),
}))

let settings = {
  enabledModules: "translation",
  translationLanguages: "ru,ja",
  translationProvider: "mymemory",
}

const mockDb = {
  siteSettings: { findUniqueOrThrow: vi.fn(() => Promise.resolve(settings)) },
  article: { findFirst: vi.fn() },
  articleTranslation: {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({}),
  },
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

const USER = { id: "u1", name: "Ada", email: "ada@x.com", role: "VIEWER" as const, avatarUrl: null }

const DOC = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "First paragraph." }] },
    { type: "paragraph", content: [{ type: "text", text: "Second paragraph." }] },
    { type: "codeBlock", content: [{ type: "text", text: "const x = 1" }] },
    { type: "pollEmbed", attrs: { pollId: "poll-42" } },
  ],
}

describe("GET /api/articles/[id]/translate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settings = { enabledModules: "translation", translationLanguages: "ru,ja", translationProvider: "mymemory" }
    mockDb.article.findFirst.mockResolvedValue({ title: "Update", body: DOC })
    mockDb.articleTranslation.findUnique.mockResolvedValue(null)
  })

  function req(id: string, lang?: string) {
    const url = `http://localhost/api/articles/${id}/translate${lang ? `?lang=${lang}` : ""}`
    return { req: new NextRequest(url), params: Promise.resolve({ id }) }
  }

  it("rejects unauthenticated", async () => {
    mockGetMobileUser.mockResolvedValue(null)
    const { GET } = await import("@/app/api/articles/[id]/translate/route")
    const { req: r, params } = req("a1", "ru")
    const res = await GET(r, { params })
    expect(res.status).toBe(401)
  })

  it("requires a lang param", async () => {
    mockGetMobileUser.mockResolvedValue(USER)
    const { GET } = await import("@/app/api/articles/[id]/translate/route")
    const { req: r, params } = req("a1")
    const res = await GET(r, { params })
    expect(res.status).toBe(400)
  })

  it("rejects a language not in the configured allow-list, even with an odd empty-list edge case", async () => {
    mockGetMobileUser.mockResolvedValue(USER)
    settings.translationLanguages = ""
    const { GET } = await import("@/app/api/articles/[id]/translate/route")
    const { req: r, params } = req("a1", "ru")
    const res = await GET(r, { params })
    expect(res.status).toBe(400)
    expect(mockTranslate).not.toHaveBeenCalled()
  })

  it("translates each block independently: no reassembly mismatch", async () => {
    mockGetMobileUser.mockResolvedValue(USER)
    const { GET } = await import("@/app/api/articles/[id]/translate/route")
    const { req: r, params } = req("a1", "ru")
    const res = await GET(r, { params })
    const data = await res.json()
    expect(data.blocks).toEqual([
      { type: "paragraph", text: "[ru] First paragraph." },
      { type: "paragraph", text: "[ru] Second paragraph." },
      { type: "code", text: "const x = 1" },
      { type: "poll", pollId: "poll-42" },
    ])
    // title + 2 paragraphs; code and poll never sent to the provider.
    expect(mockTranslate).toHaveBeenCalledTimes(3)
  })

  it("404s for a missing article", async () => {
    mockGetMobileUser.mockResolvedValue(USER)
    mockDb.article.findFirst.mockResolvedValue(null)
    const { GET } = await import("@/app/api/articles/[id]/translate/route")
    const { req: r, params } = req("gone", "ru")
    const res = await GET(r, { params })
    expect(res.status).toBe(404)
  })

  it("returns a clean 500 instead of an unhandled rejection when a DB read fails transiently", async () => {
    mockGetMobileUser.mockResolvedValue(USER)
    mockDb.article.findFirst.mockRejectedValueOnce(new Error("connection reset"))
    const { GET } = await import("@/app/api/articles/[id]/translate/route")
    const { req: r, params } = req("a1", "ru")
    const res = await GET(r, { params })
    expect(res.status).toBe(500)
  })
})
