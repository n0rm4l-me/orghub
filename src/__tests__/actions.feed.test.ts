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
    update: vi.fn().mockResolvedValue({}),
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

describe("markFeedSeen", () => {
  beforeEach(() => vi.clearAllMocks())

  it("does nothing for an anonymous visitor", async () => {
    mockAuth.mockResolvedValue(null)
    const { markFeedSeen } = await import("@/lib/actions/feed")
    await markFeedSeen()
    expect(mockDb.user.update).not.toHaveBeenCalled()
  })

  it("stamps lastFeedVisitAt for the signed-in user", async () => {
    signInAs(USERS.viewer)
    const { markFeedSeen } = await import("@/lib/actions/feed")
    await markFeedSeen()
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: USERS.viewer.id },
      data: { lastFeedVisitAt: expect.any(Date) },
    })
  })
})
