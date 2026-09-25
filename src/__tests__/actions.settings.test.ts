import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"

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
  viewer: { id: "u-viewer", email: "viewer@x.com", name: "Viewer", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  editor: { id: "u-editor", email: "editor@x.com", name: "Editor", role: "EDITOR", active: true, avatarUrl: null, locationId: null },
  admin: { id: "u-admin", email: "admin@x.com", name: "Admin", role: "ADMIN", active: true, avatarUrl: null, locationId: null },
}

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  siteSettings: {
    upsert: vi.fn().mockResolvedValue({}),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

const ENV_KEYS = ["LDAP_URL", "LDAP_DEV_MODE", "AUTH_OKTA_ID"] as const
let savedEnv: Record<string, string | undefined>

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedEnv = {}
    for (const k of ENV_KEYS) { savedEnv[k] = process.env[k]; delete process.env[k] }
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k]
      else process.env[k] = savedEnv[k]
    }
  })

  describe("toggleLocalAuth", () => {
    it("VIEWER is rejected", async () => {
      signInAs(USERS.viewer)
      const { toggleLocalAuth } = await import("@/lib/actions/settings")
      await expect(toggleLocalAuth(false)).rejects.toThrow(/REDIRECT/)
      expect(mockDb.siteSettings.upsert).not.toHaveBeenCalled()
    })

    it("ADMIN cannot disable password login with no other provider configured", async () => {
      signInAs(USERS.admin)
      const { toggleLocalAuth } = await import("@/lib/actions/settings")
      const result = await toggleLocalAuth(false)
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.siteSettings.upsert).not.toHaveBeenCalled()
    })

    it("ADMIN can disable password login when LDAP_URL is configured", async () => {
      process.env.LDAP_URL = "ldap://example.com"
      signInAs(USERS.admin)
      const { toggleLocalAuth } = await import("@/lib/actions/settings")
      const result = await toggleLocalAuth(false)
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.siteSettings.upsert).toHaveBeenCalledTimes(1)
    })

    it("ADMIN can disable password login when Okta is configured", async () => {
      process.env.AUTH_OKTA_ID = "some-okta-client-id"
      signInAs(USERS.admin)
      const { toggleLocalAuth } = await import("@/lib/actions/settings")
      const result = await toggleLocalAuth(false)
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.siteSettings.upsert).toHaveBeenCalledTimes(1)
    })

    it("ADMIN can always re-enable password login, regardless of other providers", async () => {
      signInAs(USERS.admin)
      const { toggleLocalAuth } = await import("@/lib/actions/settings")
      const result = await toggleLocalAuth(true)
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.siteSettings.upsert).toHaveBeenCalledTimes(1)
    })
  })

  describe("saveSettings validation", () => {
    function fd(fields: Record<string, string>) {
      const f = new FormData()
      for (const [k, v] of Object.entries(fields)) f.set(k, v)
      return f
    }

    it("EDITOR is rejected (ADMIN-only)", async () => {
      signInAs(USERS.editor)
      const { saveSettings } = await import("@/lib/actions/settings")
      await expect(saveSettings(fd({ siteName: "Acme" }))).rejects.toThrow(/REDIRECT/)
    })

    it("rejects an empty site name", async () => {
      signInAs(USERS.admin)
      const { saveSettings } = await import("@/lib/actions/settings")
      const result = await saveSettings(fd({ siteName: "" }))
      expect(result).toMatchObject({ ok: false, field: "siteName" })
    })

    it("rejects a javascript: logo URL", async () => {
      signInAs(USERS.admin)
      const { saveSettings } = await import("@/lib/actions/settings")
      const result = await saveSettings(fd({ siteName: "Acme", logoUrl: "javascript:alert(1)" }))
      expect(result).toMatchObject({ ok: false, field: "logoUrl" })
      expect(mockDb.siteSettings.upsert).not.toHaveBeenCalled()
    })

    it("rejects a non-hex primary color", async () => {
      signInAs(USERS.admin)
      const { saveSettings } = await import("@/lib/actions/settings")
      const result = await saveSettings(fd({ siteName: "Acme", primaryColor: "blue" }))
      expect(result).toMatchObject({ ok: false, field: "primaryColor" })
    })

    it("accepts a valid submission", async () => {
      signInAs(USERS.admin)
      const { saveSettings } = await import("@/lib/actions/settings")
      const result = await saveSettings(fd({ siteName: "Acme", primaryColor: "#2563eb" }))
      expect(result).toMatchObject({ ok: true })
      expect(mockDb.siteSettings.upsert).toHaveBeenCalledTimes(1)
    })
  })

  describe("saveEnabledModules", () => {
    it("rejects an unknown module id", async () => {
      signInAs(USERS.admin)
      const { saveEnabledModules } = await import("@/lib/actions/settings")
      const result = await saveEnabledModules(["kudos", "not-a-real-module"])
      expect(result).toMatchObject({ ok: false })
      expect(mockDb.siteSettings.upsert).not.toHaveBeenCalled()
    })

    it("EDITOR is rejected (ADMIN-only)", async () => {
      signInAs(USERS.editor)
      const { saveEnabledModules } = await import("@/lib/actions/settings")
      await expect(saveEnabledModules(["kudos"])).rejects.toThrow(/REDIRECT/)
    })
  })
})
