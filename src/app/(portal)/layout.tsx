export const dynamic = "force-dynamic"

import { Header } from "@/components/header"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { PortalMain } from "@/components/portal-width"
import { PortalAppearanceSync } from "@/components/portal-appearance-sync"

/**
 * Chrome for the reader-facing side of the portal.
 *
 * The admin console and the sign-in screen sit outside this group so they are
 * free of the public header: admin brings its own sidebar, and a login page with
 * a "Sign in" link in its own header is nonsense.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortalAppearanceSync />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60]
          focus:rounded-lg focus:bg-popover focus:px-4 focus:py-2 focus:text-sm focus:font-medium
          focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand"
      >
        Skip to content
      </a>
      <AnnouncementBanner />
      <Header />
      <PortalMain>{children}</PortalMain>
      {process.env.SOURCE_URL && (
        <footer className="mt-8 pb-6 text-center">
          <a href={process.env.SOURCE_URL} className="text-xs text-muted-foreground hover:underline" target="_blank" rel="noopener noreferrer">
            Source code (AGPL v3)
          </a>
        </footer>
      )}
    </>
  )
}
