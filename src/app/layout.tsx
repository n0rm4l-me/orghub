import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { getSettings } from "@/lib/settings"
import { ToastProvider } from "@/components/ui/toaster"

const geist = Geist({ subsets: ["latin"] })

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
    <html lang="en" className="h-full">
      <head>
        <style>{`:root { --brand: ${settings.primaryColor}; }`}</style>
      </head>
      <body className={`${geist.className} h-full bg-gray-50 antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
