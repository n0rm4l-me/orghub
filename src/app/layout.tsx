import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import { getSettings } from "@/lib/settings"
import { ToastProvider } from "@/components/ui/toaster"

const geist = GeistSans

// Layout reads from DB (site settings), so all pages must be dynamic
export const dynamic = "force-dynamic"

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
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <style>{`:root { --brand: ${settings.primaryColor}; }`}</style>
        {/* Blocking script: sets .dark on <html> before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme'),d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d))document.documentElement.classList.add('dark');var f=localStorage.getItem('fontSize');if(f==='sm')document.documentElement.classList.add('font-sm');else if(f==='lg')document.documentElement.classList.add('font-lg')})()` }} />
      </head>
      <body className={`${geist.className} h-full bg-gray-50 antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
