import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("REDIRECT") }),
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
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    article: { findUnique: vi.fn(), update: vi.fn() },
    articleTranslation: { upsert: vi.fn() },
    kudos: { aggregate: vi.fn(), create: vi.fn() },
    siteSettings: { findUniqueOrThrow: vi.fn().mockResolvedValue({ enabledModules: "kudos" }) },
    auditLog: { create: vi.fn() },
  },
}))

const REDIRECT = /REDIRECT/

describe("unauthenticated user is rejected by server actions", () => {
  beforeEach(() => vi.clearAllMocks())

  it("translateArticle rejects", async () => {
    const { translateArticle } = await import("@/lib/actions/translate")
    await expect(translateArticle("id1", "ja")).rejects.toThrow(REDIRECT)
  })

  it("sendKudos rejects", async () => {
    const { sendKudos } = await import("@/lib/actions/kudos")
    const fd = new FormData()
    fd.set("toId", "other"); fd.set("amount", "1"); fd.set("message", "hi")
    await expect(sendKudos(fd)).resolves.toMatchObject({ ok: false })
  })

  it("redeemKudos rejects unauthenticated", async () => {
    const { redeemKudos } = await import("@/lib/actions/kudos")
    await expect(redeemKudos(10)).resolves.toMatchObject({ ok: false })
  })
})
