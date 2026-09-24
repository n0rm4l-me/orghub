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
  viewer: { id: "u-viewer", email: "viewer@x.com", name: "Viewer", role: "VIEWER", active: true, avatarUrl: null, locationId: null },
  editor: { id: "u-editor", email: "editor@x.com", name: "Editor", role: "EDITOR", active: true, avatarUrl: null, locationId: null },
}

const mockDb = {
  user: {
    findUnique: vi.fn((args: { where: { id: string } }) => {
      const u = Object.values(USERS).find((u) => u.id === args.where.id)
      return Promise.resolve(u ?? null)
    }),
  },
  siteSettings: {
    findUniqueOrThrow: vi.fn().mockResolvedValue({ enabledModules: "polls,kudos,dining,suggestions" }),
  },
  auditLog: { create: vi.fn().mockResolvedValue({}) },
  $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
}

const mockTx = {
  poll: { create: vi.fn().mockResolvedValue({ id: "poll-1" }) },
  pollOption: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
}

vi.mock("@/lib/db", () => ({ db: mockDb }))

function signInAs(user: MockUser) {
  mockAuth.mockResolvedValue({ user: { id: user.id } })
}

function pollFormData() {
  const fd = new FormData()
  fd.set("question", "Favorite lunch spot?")
  fd.append("option", "Cafeteria")
  fd.append("option", "Food truck")
  return fd
}

describe("polls authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockTx))
  })

  it("VIEWER is rejected from creating a poll", async () => {
    signInAs(USERS.viewer)
    const { createPoll } = await import("@/lib/actions/polls")
    await expect(createPoll(pollFormData())).rejects.toThrow(/REDIRECT/)
    expect(mockTx.poll.create).not.toHaveBeenCalled()
  })

  it("EDITOR can create a poll", async () => {
    signInAs(USERS.editor)
    const { createPoll } = await import("@/lib/actions/polls")
    const result = await createPoll(pollFormData())
    expect(result).toMatchObject({ ok: true })
    expect(mockTx.poll.create).toHaveBeenCalledTimes(1)
    expect(mockTx.pollOption.createMany).toHaveBeenCalledTimes(1)
  })

  it("castVote rejects an unauthenticated visitor", async () => {
    mockAuth.mockResolvedValue(null)
    const { castVote } = await import("@/lib/actions/polls")
    await expect(castVote("poll-1", ["opt-1"])).resolves.toMatchObject({ ok: false })
  })
})
