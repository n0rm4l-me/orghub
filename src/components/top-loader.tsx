"use client"

import { usePathname } from "next/navigation"
import NextTopLoader from "nextjs-toploader"

/**
 * The bar always spans the full viewport width at y=0, so it draws directly
 * over whatever sits there: the brand-colored portal header, or admin's
 * plain light background (admin has no top bar of its own). One fixed color
 * can't read against both, so pick per section: white matches the header's
 * own text-white convention, brand reads fine on admin's light background.
 */
export function TopLoader() {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith("/admin") ?? false

  return (
    <NextTopLoader
      color={isAdmin ? "var(--brand)" : "#ffffff"}
      height={3}
      shadow={false}
      showSpinner={false}
    />
  )
}
