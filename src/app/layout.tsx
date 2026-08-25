import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/header"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OrgHub",
  description: "Your company portal",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50 antialiased`}>
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
