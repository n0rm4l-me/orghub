// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import { AnnouncementBannerClient } from "@/components/announcement-banner-client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}))

// jsdom in this Vitest/Node combo doesn't attach a working localStorage to
// window on its own (Node's own experimental global conflicts with it) --
// a real browser always has one, so this is purely a test-environment gap,
// not something the component needs to guard against itself.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, value) }
}
Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), writable: true })
Object.defineProperty(globalThis, "localStorage", { value: window.localStorage, writable: true })

const announcement = {
  id: "ann-1",
  message: "Rakuten Optimism Week starts October 5",
  linkUrl: "/events",
  linkLabel: "See the schedule",
  color: "brand",
}

function mount(el: React.ReactElement): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(el))
  return { container, root }
}

function unmount(container: HTMLDivElement, root: Root) {
  act(() => root.unmount())
  container.remove()
}

beforeEach(() => window.localStorage.clear())
afterEach(() => window.localStorage.clear())

describe("AnnouncementBannerClient", () => {
  it("renders the message and a dismiss button", () => {
    const { container, root } = mount(<AnnouncementBannerClient announcement={announcement} />)
    expect(container.textContent).toContain("Rakuten Optimism Week starts October 5")
    const button = container.querySelector('button[aria-label="Dismiss announcement"]')
    expect(button).not.toBeNull()
    unmount(container, root)
  })

  it("clicking dismiss removes the banner from the DOM", () => {
    const { container, root } = mount(<AnnouncementBannerClient announcement={announcement} />)
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="Dismiss announcement"]')
    expect(button).not.toBeNull()
    act(() => button!.click())
    expect(container.querySelector('[role="status"]')).toBeNull()
    unmount(container, root)
  })

  it("persists the dismissal to localStorage so a fresh mount stays hidden", () => {
    const first = mount(<AnnouncementBannerClient announcement={announcement} />)
    const button = first.container.querySelector<HTMLButtonElement>('button[aria-label="Dismiss announcement"]')
    act(() => button!.click())
    unmount(first.container, first.root)

    const second = mount(<AnnouncementBannerClient announcement={announcement} />)
    expect(second.container.querySelector('[role="status"]')).toBeNull()
    unmount(second.container, second.root)
  })

  it("clicking dismiss still hides the banner when localStorage.setItem throws", () => {
    // The real-world case this exists for: private-browsing storage caps,
    // storage disabled by policy, quota exceeded -- anything that makes
    // setItem throw. The visible dismiss must not depend on that
    // succeeding, only on being attempted.
    const setItemSpy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError")
    })
    try {
      const { container, root } = mount(<AnnouncementBannerClient announcement={announcement} />)
      const button = container.querySelector<HTMLButtonElement>('button[aria-label="Dismiss announcement"]')
      expect(button).not.toBeNull()
      act(() => button!.click())
      expect(container.querySelector('[role="status"]')).toBeNull()
      unmount(container, root)
    } finally {
      setItemSpy.mockRestore()
    }
  })

  it("dismissing one mounted instance also hides a second instance mounted at the same time", () => {
    const a = mount(<AnnouncementBannerClient announcement={announcement} />)
    const b = mount(<AnnouncementBannerClient announcement={announcement} />)
    expect(a.container.querySelector('[role="status"]')).not.toBeNull()
    expect(b.container.querySelector('[role="status"]')).not.toBeNull()

    const buttonA = a.container.querySelector<HTMLButtonElement>('button[aria-label="Dismiss announcement"]')
    act(() => buttonA!.click())

    expect(a.container.querySelector('[role="status"]')).toBeNull()
    expect(b.container.querySelector('[role="status"]')).toBeNull()

    unmount(a.container, a.root)
    unmount(b.container, b.root)
  })
})
