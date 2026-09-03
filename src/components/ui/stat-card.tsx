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
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground/50" aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </>
  )
  const shell = "rounded-xl border border-border bg-card p-4 text-card-foreground"
  return href ? (
    <Link href={href} className={`${shell} transition hover:border-muted-foreground/40 hover:shadow-sm`}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  )
}
