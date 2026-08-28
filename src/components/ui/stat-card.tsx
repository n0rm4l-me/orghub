import Link from "next/link"
import type { LucideIcon } from "lucide-react"

export function StatCard({
  href,
  icon: Icon,
  label,
  value,
  sub,
}: {
  href?: string
  icon: LucideIcon
  label: string
  value: number
  sub: string
}) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <Icon className="size-4 text-gray-300" aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
    </>
  )
  const shell = "rounded-xl border border-gray-200 bg-white p-4"
  return href ? (
    <Link href={href} className={`${shell} transition hover:border-gray-300 hover:shadow-sm`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  )
}
