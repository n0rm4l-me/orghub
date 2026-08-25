import Link from "next/link"
import { Search, LayoutDashboard } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { getNavPages } from "@/lib/nav"
import { getCurrentUser, can } from "@/lib/rbac"
import { BrandLogo } from "@/components/brand-logo"
import { HeaderNav } from "@/components/header-nav"

export async function Header() {
  const [settings, user, pages] = await Promise.all([
    getSettings(),
    getCurrentUser(),
    getNavPages(),
  ])

  const initials =
    (user?.name ?? user?.email ?? "?")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"

  const items = [
    { href: "/", label: "Feed" },
    ...pages.map((page) => ({ href: `/pages/${page.slug}`, label: page.title })),
  ]

  return (
    <header className="sticky top-0 z-50 bg-brand text-white">
      {/* Fixed height: the bar never grows or shrinks as its contents load. */}
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-md transition-opacity hover:opacity-85"
          aria-label={`${settings.siteName} home`}
        >
          <BrandLogo logoUrl={settings.logoUrl} siteName={settings.siteName} height={30} />
        </Link>

        <HeaderNav items={items} />

        {/* Plain GET form: search works with JavaScript disabled. */}
        <form action="/" method="get" role="search" className="ml-auto hidden sm:block">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-white/60"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              placeholder="Search news"
              aria-label="Search news"
              className="h-9 w-40 rounded-lg border border-white/15 bg-white/10 pr-3 pl-8 text-sm
                text-white transition-all placeholder:text-white/60
                hover:bg-white/15
                focus:w-56 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-1 sm:ml-0 ml-auto">
          {can.manageContent(user) && (
            <Link
              href="/admin"
              title="Admin"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-white/80
                transition-colors hover:bg-white/10 hover:text-white"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              <span className="hidden lg:inline">Admin</span>
            </Link>
          )}

          {user ? (
            <span className="flex items-center gap-2 pl-1">
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20
                  text-[11px] font-semibold"
              >
                {initials}
              </span>
              <span className="hidden max-w-[130px] truncate text-sm text-white/85 lg:block">
                {user.name ?? user.email}
              </span>
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium transition-colors
                hover:bg-white/25"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
