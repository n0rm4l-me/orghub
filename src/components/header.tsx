"use client"

import Link from "next/link"
import { Bell, Search } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Header() {
  return (
    <header className="bg-blue-600 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-xs font-bold">
              OH
            </div>
            OrgHub
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link href="/" className="text-white border-b-2 border-white pb-0.5">
              Feed
            </Link>
            <Link href="/pages" className="text-white/70 hover:text-white transition">
              Pages
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-white/70 hover:text-white transition">
            <Search className="w-5 h-5" />
          </button>
          <button className="relative text-white/70 hover:text-white transition">
            <Bell className="w-5 h-5" />
          </button>
          <Avatar className="w-8 h-8 cursor-pointer">
            <AvatarFallback className="bg-white/20 text-white text-xs font-semibold">
              PP
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
