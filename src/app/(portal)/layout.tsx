import { Header } from "@/components/header"

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
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60]
          focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium
          focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  )
}
