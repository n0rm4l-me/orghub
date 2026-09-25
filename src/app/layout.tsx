import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import { getSettings } from "@/lib/settings"
import { ToastProvider } from "@/components/ui/toaster"
import { TopLoader } from "@/components/top-loader"

const geist = GeistSans

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: { default: settings.siteName, template: `%s · ${settings.siteName}` },
    description: "Your company portal",
  }
}

/**
 * Document shell only.
 *
 * Chrome lives in the route groups: `(portal)` adds the public header, `/admin`
 * its own sidebar, and `/login` and `/no-access` deliberately have neither. The
 * brand colour is injected here as a `:root` variable so it is present in the
 * very first paint, before any component mounts.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()

  return (
    <html lang="en" className="h-full bg-background" suppressHydrationWarning>
      <head>
        <style>{`:root { --brand: ${settings.primaryColor}; }`}</style>
        {/* Deliberately blocking (no async/defer): applies portal theme/fontSize
            before first paint to prevent FOUC (see public/theme-init.js). Loaded by
            src, not inlined, so script-src in next.config.ts's CSP can stay 'self'
            with no 'unsafe-inline'. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
      </head>
      <body className={`${geist.className} min-h-full bg-background text-foreground antialiased`}>
        <TopLoader />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
