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
  siteSettings: { update: vi.fn().mockResolvedValue({}) },
}
vi.mock("@/lib/db", () => ({ db: mockDb }))

type MockUser = { id: string; email: string; name: string; role: "VIEWER" | "EDITOR" | "ADMIN"; active: boolean; avatarUrl: null; locationId: null }
const USERS: Record<string, MockUser> = {
  editor: { id: "u-editor", email: "editor@x.com", name: "Editor", role: "EDITOR", active: true, avatarUrl: null, locationId: null },
  admin: { id: "u-admin", email: "admin@x.com", name: "Admin", role: "ADMIN", active: true, avatarUrl: null, locationId: null },
}
function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}
function formData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe("saveTranslationSettings", () => {
  beforeEach(() => vi.clearAllMocks())

  it("EDITOR is rejected (ADMIN-only)", async () => {
    signInAs(USERS.editor)
    const { saveTranslationSettings } = await import("@/lib/actions/translation-settings")
    await expect(saveTranslationSettings(formData({ translationProvider: "mymemory", lang_en: "on" }))).rejects.toThrow(/REDIRECT/)
  })

  it("rejects an unknown provider", async () => {
    signInAs(USERS.admin)
    const { saveTranslationSettings } = await import("@/lib/actions/translation-settings")
    const result = await saveTranslationSettings(formData({ translationProvider: "google-translate", lang_en: "on" }))
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.siteSettings.update).not.toHaveBeenCalled()
  })

  it("rejects when no language is selected at all", async () => {
    signInAs(USERS.admin)
    const { saveTranslationSettings } = await import("@/lib/actions/translation-settings")
    const result = await saveTranslationSettings(formData({ translationProvider: "mymemory" }))
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.siteSettings.update).not.toHaveBeenCalled()
  })

  it("combines checked preset languages with valid extra codes, deduped", async () => {
    signInAs(USERS.admin)
    const { saveTranslationSettings } = await import("@/lib/actions/translation-settings")
    const result = await saveTranslationSettings(formData({
      translationProvider: "deepl",
      lang_en: "on",
      lang_ru: "on",
      translationExtraLanguages: "pt-br, en, de",
    }))
    expect(result).toMatchObject({ ok: true })
    expect(mockDb.siteSettings.update).toHaveBeenCalledWith({
      where: { id: "singleton" },
      data: { translationProvider: "deepl", translationLanguages: "en,ru,pt-br,de" },
    })
  })

  it("silently drops an extra code that doesn't look like a language tag", async () => {
    signInAs(USERS.admin)
    const { saveTranslationSettings } = await import("@/lib/actions/translation-settings")
    await saveTranslationSettings(formData({
      translationProvider: "mymemory",
      lang_en: "on",
      translationExtraLanguages: "not a lang code, ru",
    }))
    expect(mockDb.siteSettings.update).toHaveBeenCalledWith({
      where: { id: "singleton" },
      data: { translationProvider: "mymemory", translationLanguages: "en,ru" },
    })
  })
})
