import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { db } from "@/lib/db"

const GRADIENTS = [
  "from-blue-500 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-orange-400 to-rose-500",
  "from-violet-400 to-purple-600",
  "from-sky-400 to-blue-600",
]

const CATEGORY_COLORS: Record<string, string> = {
  engineering: "bg-emerald-100 text-emerald-700",
  hr: "bg-orange-100 text-orange-700",
  announcements: "bg-blue-100 text-blue-700",
  events: "bg-violet-100 text-violet-700",
}

const CATEGORIES = ["All", "Engineering", "HR", "Announcements", "Events"]

const UPCOMING_EVENTS = [
  { month: "AUG", day: "29", title: "Tech Talk: AI in Production", time: "3:00 PM · Room B" },
  { month: "SEP", day: "5", title: "Osaka Office Opening", time: "All day · Osaka HQ" },
  { month: "SEP", day: "12", title: "Q3 All Hands Meeting", time: "10:00 AM · Main Hall" },
]

const QUICK_LINKS = [
  { emoji: "📋", label: "Benefits & Perks" },
  { emoji: "🏢", label: "Office Maps" },
  { emoji: "📞", label: "IT Support" },
  { emoji: "🍱", label: "Cafeteria Menu" },
  { emoji: "🚌", label: "Shuttle Schedule" },
]

export default async function FeedPage() {
  const articles = await db.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    include: {
      author: true,
      categories: { include: { category: true } },
    },
    take: 10,
  })

  const mapped = articles.map((a, i) => {
    const category = a.categories[0]?.category
    const initials = a.author.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?"
    return {
      id: a.id,
      title: a.title,
      excerpt: a.excerpt ?? "",
      category: category?.name ?? "",
      categoryColor: CATEGORY_COLORS[category?.slug ?? ""] ?? "bg-gray-100 text-gray-700",
      coverGradient: GRADIENTS[i % GRADIENTS.length],
      author: { name: a.author.name ?? "Unknown", initials },
      date: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
      readTime: "3 min",
    }
  })

  const [pinned, ...rest] = mapped

  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        {/* Category filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                cat === "All"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-blue-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Pinned article */}
        <Link href={`/articles/${pinned.id}`} className="block mb-5">
          <div className="rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow cursor-pointer bg-white">
            <div className={`h-52 bg-gradient-to-br ${pinned.coverGradient} relative flex items-end p-6`}>
              <div className="absolute top-4 left-4">
                <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                  📌 Pinned
                </span>
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium uppercase tracking-wide">
                  {pinned.category}
                </p>
                <h2 className="text-white text-2xl font-bold mt-1 leading-tight">
                  {pinned.title}
                </h2>
              </div>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                    {pinned.author.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">{pinned.author.name}</p>
                  <p className="text-xs text-gray-500">{pinned.date} · {pinned.readTime} read</p>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Article grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rest.map((article) => (
            <Link key={article.id} href={`/articles/${article.id}`} className="block">
              <div className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className={`h-36 bg-gradient-to-br ${article.coverGradient}`} />
                <div className="p-4">
                  <Badge variant="secondary" className={`${article.categoryColor} text-[11px] font-semibold border-0`}>
                    {article.category}
                  </Badge>
                  <h3 className="font-semibold text-gray-900 mt-2 mb-2 leading-snug text-sm">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 text-xs">{article.excerpt}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px] font-bold">
                          {article.author.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-500">{article.date}</span>
                    </div>
                    <span className="text-xs text-gray-400">{article.readTime} read</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-72 shrink-0 hidden lg:block space-y-5">
        {/* Upcoming events */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm flex items-center gap-2">
            📅 Upcoming Events
          </h3>
          <div className="space-y-3">
            {UPCOMING_EVENTS.map((event) => (
              <div key={event.title} className="flex gap-3 items-start">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-blue-700 leading-none">{event.month}</span>
                  <span className="text-lg font-black text-blue-700 leading-none">{event.day}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 leading-snug">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">⚡ Quick Links</h3>
          <div className="space-y-0.5">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.label}
                href="#"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition"
              >
                {link.emoji} {link.label}
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
