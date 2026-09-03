export const dynamic = "force-dynamic"

import { headers } from "next/headers"
import { signOut } from "@/auth"
import Link from "next/link"
import { LogOut, ArrowUpRight } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { requireRole, can } from "@/lib/rbac"
import { AdminNav } from "@/components/admin-nav"
import { AdminMobileSidebar } from "@/components/admin-mobile-sidebar"
import { BrandLogo } from "@/components/brand-logo"
import { parseModules } from "@/lib/modules"
import { gravatarUrl } from "@/lib/gravatar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireRole("EDITOR"), getSettings()])

  const initials =
    (user.name ?? user.email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"

  const modules            = parseModules(settings.enabledModules)
  const eventsEnabled      = modules.has("events")
  const pollsEnabled       = modules.has("polls")
  const kudosEnabled       = modules.has("kudos")
  const diningEnabled      = modules.has("dining")
  const suggestionsEnabled = modules.has("suggestions")
  const canAdminister      = can.manageUsers(user)

  async function signOutAction() {
    "use server"
    const hdrs = await headers()
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000"
    const proto = hdrs.get("x-forwarded-proto") ?? "http"
    await signOut({ redirectTo: `${proto}://${host}/` })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar + drawer */}
      <AdminMobileSidebar
        canAdminister={canAdminister}
        eventsEnabled={eventsEnabled}
        pollsEnabled={pollsEnabled}
        kudosEnabled={kudosEnabled}
        diningEnabled={diningEnabled}
        suggestionsEnabled={suggestionsEnabled}
        userName={user.name ?? user.email}
        userRole={user.role}
        gravatarUrl={user.avatarUrl ?? (settings.gravatarsEnabled ? gravatarUrl(user.email, 28) : undefined)}
        signOutAction={signOutAction}
        siteName={settings.siteName}
      />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-gray-900 md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-white/5 px-6">
          <Link
            href="/admin"
            className="flex items-center rounded-md transition-opacity hover:opacity-80"
          >
            <BrandLogo logoUrl={settings.logoUrl} siteName={settings.siteName} height={28} />
          </Link>
        </div>

        <AdminNav
          canAdminister={canAdminister}
          eventsEnabled={eventsEnabled}
          pollsEnabled={pollsEnabled}
          kudosEnabled={kudosEnabled}
          diningEnabled={diningEnabled}
          suggestionsEnabled={suggestionsEnabled}
        />

        <div className="shrink-0 border-t border-white/5 p-3">
          <Link
            href="/"
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400
              transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
            View portal
          </Link>

          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
            <Avatar className="size-7 shrink-0">
              {(user.avatarUrl || settings.gravatarsEnabled) && (
                <AvatarImage src={user.avatarUrl ?? gravatarUrl(user.email, 28)} alt="" />
              )}
              <AvatarFallback className="bg-brand text-[11px] font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user.name ?? user.email}</p>
              <p className="text-[11px] text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="grid size-7 place-items-center rounded-md text-gray-500 transition-colors
                  hover:bg-white/10 hover:text-white"
              >
                <LogOut className="size-3.5" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  )
}
