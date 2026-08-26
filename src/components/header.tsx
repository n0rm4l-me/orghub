import Link from "next/link"
import { Search } from "lucide-react"
import { db } from "@/lib/db"
import { getSettings } from "@/lib/settings"
import { getNavPages } from "@/lib/nav"
import { getCurrentUser, can } from "@/lib/rbac"
import { parseModules } from "@/lib/modules"
import { BrandLogo } from "@/components/brand-logo"
import { HeaderNav } from "@/components/header-nav"
import { UserMenu } from "@/components/user-menu"
import { HeaderContainer } from "@/components/portal-width"
import { signOut } from "@/auth"
import { gravatarUrl } from "@/lib/gravatar"

export async function Header({ widthToggle }: { widthToggle?: React.ReactNode } = {}) {
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

  const enabled = parseModules(settings.enabledModules)

  let feedUnread = 0
  if (user) {
    const feedUser = await db.user.findUnique({
      where: { id: user.id },
      select: { lastFeedVisitAt: true },
    })
    if (feedUser?.lastFeedVisitAt) {
      feedUnread = await db.article.count({
        where: {
          published: true,
          eventDate: null,
          publishedAt: { gt: feedUser.lastFeedVisitAt },
        },
      })
    }
  }

  const items = [
    { href: "/", label: "Feed", ...(feedUnread > 0 ? { badge: feedUnread } : {}) },
    ...(enabled.has("events") ? [{ href: "/events", label: "Calendar" }] : []),
    ...(enabled.has("pages")
      ? pages.map((page) => ({
          href: `/pages/${page.slug}`,
          label: page.title,
          ...(page.children?.length
            ? { children: page.children.map((c) => ({ href: `/pages/${c.slug}`, label: c.title })) }
            : {}),
        }))
      : []),
  ]

  return (
    <header className="sticky top-0 z-50 bg-brand text-white">
      {/* Fixed height: the bar never grows or shrinks as its contents load. */}
      <HeaderContainer>
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

        <div className="flex shrink-0 items-center gap-1 ml-auto sm:ml-0">
          {widthToggle}
          {user ? (
            <UserMenu
              initials={initials}
              gravatarUrl={settings.gravatarsEnabled ? gravatarUrl(user.email, 28) : undefined}
              name={user.name ?? user.email ?? ""}
              canAdmin={can.manageContent(user)}
              signOutAction={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            />
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
      </HeaderContainer>
    </header>
  )
}
