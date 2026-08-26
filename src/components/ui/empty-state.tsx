import Link from "next/link"
import type { LucideIcon } from "lucide-react"

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; href: string }
}

/**
 * Shown when a collection is legitimately empty. Always offers the next step so
 * the screen is never a dead end.
 */
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Icon className="h-6 w-6 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm
            font-medium text-white transition hover:brightness-95 active:brightness-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
