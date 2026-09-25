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

type MockUser = { id: string; email: string; name: string; role: "VIEWER" | "EDITOR" | "ADMIN"; active: boolean; avatarUrl: null; locationId: string | null }

// Fixed venue under loc-B, used to test EDITORs scoped to it and to a different location.
const VENUE = { id: "venue-1", name: "Cafeteria", locationId: "loc-B", location: { timezone: "UTC" } }

const USERS: Record<string, MockUser> = {
  viewer:  { id: "u-viewer",  email: "viewer@x.com",  name: "Viewer",   role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  editorA: { id: "u-editorA", email: "editorA@x.com", name: "Editor A", role: "EDITOR", active: true, avatarUrl: null, locationId: "loc-A" },
  editorB: { id: "u-editorB", email: "editorB@x.com", name: "Editor B", role: "EDITOR", active: true, avatarUrl: null, locationId: VENUE.locationId },
  admin:   { id: "u-admin",   email: "admin@x.com",   name: "Admin",    role: "ADMIN",  active: true, avatarUrl: null, locationId: null },
}

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  venue: {
    findFirst: vi.fn((args: { where: { id: string; locationId?: string } }) => {
      if (args.where.id !== VENUE.id) return Promise.resolve(null)
      if ("locationId" in args.where && args.where.locationId !== VENUE.locationId) return Promise.resolve(null)
      return Promise.resolve(VENUE)
    }),
  },
  location: { create: vi.fn().mockResolvedValue({ id: "loc-new" }) },
  mealSlot: { findMany: vi.fn().mockResolvedValue([]) },
  kudos: { delete: vi.fn().mockResolvedValue({ id: "kudos-1" }) },
  kudosRedeemType: {
    aggregate: vi.fn().mockResolvedValue({ _max: { order: 0 } }),
    create: vi.fn().mockResolvedValue({ id: "type-1" }),
  },
  kudosRedemption: {
    findUnique: vi.fn().mockResolvedValue({ id: "redemption-1", status: "PENDING" }),
    update: vi.fn().mockResolvedValue({ id: "redemption-1", status: "REJECTED" }),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
}

const mockTx = {
  mealSlot: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  mealCategory: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

describe("authorization matrix", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockTx))
  })

  it("VIEWER is rejected from an ADMIN-only action", async () => {
    signInAs(USERS.viewer)
    const { createLocation } = await import("@/lib/actions/dining")
    const fd = new FormData()
    fd.set("name", "HQ")
    await expect(createLocation(fd)).rejects.toThrow(/REDIRECT/)
    expect(mockDb.location.create).not.toHaveBeenCalled()
  })

  it("VIEWER is rejected from deleting kudos", async () => {
    signInAs(USERS.viewer)
    const { deleteKudos } = await import("@/lib/actions/kudos")
    await expect(deleteKudos("kudos-1")).rejects.toThrow(/REDIRECT/)
    expect(mockDb.kudos.delete).not.toHaveBeenCalled()
  })

  it("ADMIN can delete kudos", async () => {
    signInAs(USERS.admin)
    const { deleteKudos } = await import("@/lib/actions/kudos")
    await expect(deleteKudos("kudos-1")).resolves.toMatchObject({ ok: true })
    expect(mockDb.kudos.delete).toHaveBeenCalledWith({ where: { id: "kudos-1" } })
  })

  it("VIEWER is rejected from creating a kudos redeem type", async () => {
    signInAs(USERS.viewer)
    const { createRedeemType } = await import("@/lib/actions/kudos")
    const fd = new FormData()
    fd.set("label", "Coffee voucher")
    await expect(createRedeemType(fd)).rejects.toThrow(/REDIRECT/)
    expect(mockDb.kudosRedeemType.create).not.toHaveBeenCalled()
  })

  it("ADMIN can create a kudos redeem type", async () => {
    signInAs(USERS.admin)
    const { createRedeemType } = await import("@/lib/actions/kudos")
    const fd = new FormData()
    fd.set("label", "Coffee voucher")
    await expect(createRedeemType(fd)).resolves.toMatchObject({ ok: true })
    expect(mockDb.kudosRedeemType.create).toHaveBeenCalledTimes(1)
  })

  it("VIEWER is rejected from rejecting a redemption", async () => {
    signInAs(USERS.viewer)
    const { rejectRedemption } = await import("@/lib/actions/kudos")
    await expect(rejectRedemption("redemption-1")).rejects.toThrow(/REDIRECT/)
    expect(mockDb.kudosRedemption.update).not.toHaveBeenCalled()
  })

  it("ADMIN can reject a pending redemption", async () => {
    signInAs(USERS.admin)
    const { rejectRedemption } = await import("@/lib/actions/kudos")
    await expect(rejectRedemption("redemption-1")).resolves.toMatchObject({ ok: true })
    expect(mockDb.kudosRedemption.update).toHaveBeenCalledWith({
      where: { id: "redemption-1" },
      data: { status: "REJECTED" },
    })
  })

  it("EDITOR out of scope is rejected from a venue under a different location", async () => {
    signInAs(USERS.editorA) // scoped to loc-A
    const { upsertSlotsAndCategories } = await import("@/lib/actions/dining")
    const result = await upsertSlotsAndCategories(VENUE.id, []) // VENUE is under loc-B
    expect(result).toMatchObject({ ok: false })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it("EDITOR in scope can act on their own location's venue", async () => {
    signInAs(USERS.editorB) // scoped to loc-B, same as VENUE
    const { upsertSlotsAndCategories } = await import("@/lib/actions/dining")
    const result = await upsertSlotsAndCategories(VENUE.id, [])
    expect(result).toMatchObject({ ok: true })
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)
  })
})
