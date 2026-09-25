import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn: unknown) => fn),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
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

// Deterministic fake: prefixes whatever text it's given, so each output can
// be traced back to the exact input that produced it. Never joins/splits.
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
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  siteSettings: { findUniqueOrThrow: vi.fn(() => Promise.resolve(settings)) },
  article: { findUnique: vi.fn() },
  articleTranslation: {
    findUnique: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({}),
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

// A realistic doc: heading, two paragraphs, a code block, an image, a poll,
// and a bullet list, so every branch of extractBlocks gets exercised.
const DOC = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Q3 update" }] },
    { type: "paragraph", content: [{ type: "text", text: "First paragraph." }] },
    { type: "paragraph", content: [{ type: "text", text: "Second paragraph." }] },
    { type: "codeBlock", content: [{ type: "text", text: "const x = 1" }] },
    { type: "image", attrs: { src: "/uploads/a.png", alt: "diagram" } },
    { type: "pollEmbed", attrs: { pollId: "poll-42" } },
    { type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet one" }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bullet two" }] }] },
    ]},
  ],
}

describe("translateArticle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settings = { enabledModules: "translation", translationLanguages: "ru,ja", translationProvider: "mymemory" }
    mockDb.article.findUnique.mockResolvedValue({ title: "Q3 update", body: DOC })
    mockDb.articleTranslation.findUnique.mockResolvedValue(null)
  })

  it("rejects an unauthenticated caller", async () => {
    mockAuth.mockResolvedValue(null)
    const { translateArticle } = await import("@/lib/actions/translate")
    await expect(translateArticle("a1", "ru")).rejects.toThrow(/REDIRECT/)
  })

  it("rejects when the translation module is disabled", async () => {
    signInAs(USERS.viewer)
    settings.enabledModules = ""
    const { translateArticle } = await import("@/lib/actions/translate")
    const result = await translateArticle("a1", "ru")
    expect(result).toMatchObject({ ok: false })
    expect(mockTranslate).not.toHaveBeenCalled()
  })

  it("rejects a language not in the configured allow-list", async () => {
    signInAs(USERS.viewer)
    const { translateArticle } = await import("@/lib/actions/translate")
    const result = await translateArticle("a1", "de")
    expect(result).toMatchObject({ ok: false })
    expect(mockTranslate).not.toHaveBeenCalled()
  })

  it("translates every block independently and maps each result back to the block that produced it", async () => {
    signInAs(USERS.viewer)
    const { translateArticle } = await import("@/lib/actions/translate")
    const result = await translateArticle("a1", "ru")
    if (!result.ok) throw new Error("expected ok")

    // title + 5 translatable blocks (2 paragraphs + 2 bullets + 1 heading); code/image/poll excluded.
    expect(mockTranslate).toHaveBeenCalledTimes(6)
    expect(result.translatedTitle).toBe("[ru] Q3 update")

    expect(result.blocks).toEqual([
      { type: "heading", level: 1, text: "[ru] Q3 update" },
      { type: "paragraph", text: "[ru] First paragraph." },
      { type: "paragraph", text: "[ru] Second paragraph." },
      { type: "code", text: "const x = 1" },
      { type: "image", src: "/uploads/a.png", alt: "diagram" },
      { type: "poll", pollId: "poll-42" },
      { type: "bullet", text: "[ru] Bullet one" },
      { type: "bullet", text: "[ru] Bullet two" },
    ])
  })

  it("never sends code or image or poll content to the translation provider", async () => {
    signInAs(USERS.viewer)
    const { translateArticle } = await import("@/lib/actions/translate")
    await translateArticle("a1", "ru")
    const sentTexts = mockTranslate.mock.calls.map((call) => call[0])
    expect(sentTexts).not.toContain("const x = 1")
    expect(sentTexts.some((t) => t.includes("poll-42"))).toBe(false)
    expect(sentTexts.some((t) => t.includes("/uploads/a.png"))).toBe(false)
  })

  it("caches the result and returns it without calling the provider again", async () => {
    signInAs(USERS.viewer)
    mockDb.articleTranslation.findUnique.mockResolvedValue({
      title: "[ru] Q3 update",
      body: JSON.stringify([{ type: "paragraph", text: "[ru] cached" }]),
    })
    const { translateArticle } = await import("@/lib/actions/translate")
    const result = await translateArticle("a1", "ru")
    expect(result).toMatchObject({ ok: true, translatedTitle: "[ru] Q3 update" })
    expect(mockTranslate).not.toHaveBeenCalled()
  })

  it("404s for a missing or unpublished article without calling the provider", async () => {
    signInAs(USERS.viewer)
    mockDb.article.findUnique.mockResolvedValue(null)
    const { translateArticle } = await import("@/lib/actions/translate")
    const result = await translateArticle("gone", "ru")
    expect(result).toMatchObject({ ok: false })
    expect(mockTranslate).not.toHaveBeenCalled()
  })

  it("returns a clean error instead of throwing when a DB read fails transiently", async () => {
    signInAs(USERS.viewer)
    mockDb.article.findUnique.mockRejectedValueOnce(new Error("connection reset"))
    const { translateArticle } = await import("@/lib/actions/translate")
    const result = await translateArticle("a1", "ru")
    expect(result).toMatchObject({ ok: false })
  })
})
