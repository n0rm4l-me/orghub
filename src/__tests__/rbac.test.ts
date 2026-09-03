import { describe, it, expect } from "vitest"
import { hasRole } from "@/lib/rbac"
import type { CurrentUser } from "@/lib/rbac"

function user(role: CurrentUser["role"]): CurrentUser {
  return { id: "1", email: "a@b.com", name: "A", role, active: true, avatarUrl: null }
}

describe("hasRole", () => {
  it("returns false for null user", () => {
    expect(hasRole(null, "VIEWER")).toBe(false)
  })

  it("VIEWER satisfies VIEWER", () => {
    expect(hasRole(user("VIEWER"), "VIEWER")).toBe(true)
  })

  it("VIEWER does not satisfy EDITOR", () => {
    expect(hasRole(user("VIEWER"), "EDITOR")).toBe(false)
  })

  it("EDITOR satisfies VIEWER", () => {
    expect(hasRole(user("EDITOR"), "VIEWER")).toBe(true)
  })

  it("EDITOR satisfies EDITOR", () => {
    expect(hasRole(user("EDITOR"), "EDITOR")).toBe(true)
  })

  it("EDITOR does not satisfy ADMIN", () => {
    expect(hasRole(user("EDITOR"), "ADMIN")).toBe(false)
  })

  it("ADMIN satisfies all roles", () => {
    expect(hasRole(user("ADMIN"), "VIEWER")).toBe(true)
    expect(hasRole(user("ADMIN"), "EDITOR")).toBe(true)
    expect(hasRole(user("ADMIN"), "ADMIN")).toBe(true)
  })
})
