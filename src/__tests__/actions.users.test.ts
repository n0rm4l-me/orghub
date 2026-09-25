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
  viewer:      { id: "u-viewer",      email: "viewer@x.com",      name: "Viewer",       role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  admin:       { id: "u-admin",       email: "admin@x.com",       name: "Admin",        role: "ADMIN",  active: true, avatarUrl: null, locationId: null },
  lastAdmin:   { id: "u-lastadmin",   email: "lastadmin@x.com",   name: "Last Admin",   role: "ADMIN",  active: true, avatarUrl: null, locationId: null },
  otherEditor: { id: "u-othereditor", email: "othereditor@x.com", name: "Other Editor", role: "EDITOR", active: true, avatarUrl: null, locationId: null },
}

// How many active admins besides the acting/target user remain: only
// `lastAdmin` is set up as the sole active admin (0 others), so tests can
// exercise the orphan-prevention branch without a second admin fixture.
let activeAdminCountExcluding: (excludeId: string) => number

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
    count: vi.fn((args: { where: { id: { not: string } } }) =>
      Promise.resolve(activeAdminCountExcluding(args.where.id.not))
    ),
    update: vi.fn().mockResolvedValue({}),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

describe("user management authorization and orphan-admin protection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: admin/viewer/otherEditor coexist, so demoting/deactivating
    // USERS.admin never orphans anything (lastAdmin is still active elsewhere).
    activeAdminCountExcluding = () => 1
  })

  it("VIEWER is rejected from changing a role", async () => {
    signInAs(USERS.viewer)
    const { changeUserRole } = await import("@/lib/actions/users")
    await expect(changeUserRole(USERS.otherEditor.id, "ADMIN")).rejects.toThrow(/REDIRECT/)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("ADMIN can promote another user", async () => {
    signInAs(USERS.admin)
    const { changeUserRole } = await import("@/lib/actions/users")
    const result = await changeUserRole(USERS.otherEditor.id, "ADMIN")
    expect(result).toMatchObject({ ok: true })
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: USERS.otherEditor.id },
      data: { role: "ADMIN" },
    })
  })

  it("demoting the last active admin is refused", async () => {
    activeAdminCountExcluding = () => 0 // no other active admin besides the target
    signInAs(USERS.admin)
    const { changeUserRole } = await import("@/lib/actions/users")
    const result = await changeUserRole(USERS.lastAdmin.id, "EDITOR")
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("VIEWER is rejected from activating/deactivating a user", async () => {
    signInAs(USERS.viewer)
    const { setUserActive } = await import("@/lib/actions/users")
    await expect(setUserActive(USERS.otherEditor.id, false)).rejects.toThrow(/REDIRECT/)
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("an ADMIN cannot deactivate their own account", async () => {
    signInAs(USERS.admin)
    const { setUserActive } = await import("@/lib/actions/users")
    const result = await setUserActive(USERS.admin.id, false)
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("deactivating the last active admin is refused", async () => {
    activeAdminCountExcluding = () => 0
    signInAs(USERS.admin)
    const { setUserActive } = await import("@/lib/actions/users")
    const result = await setUserActive(USERS.lastAdmin.id, false)
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("an ADMIN can deactivate a non-admin user", async () => {
    signInAs(USERS.admin)
    const { setUserActive } = await import("@/lib/actions/users")
    const result = await setUserActive(USERS.otherEditor.id, false)
    expect(result).toMatchObject({ ok: true })
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: USERS.otherEditor.id },
      data: { active: false },
    })
  })
})
