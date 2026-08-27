import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Shared input chrome so every text field in the app focuses identically. */
export const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base sm:text-sm text-gray-900 " +
  "placeholder:text-gray-400 transition " +
  "hover:border-gray-300 " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "disabled:bg-gray-50 disabled:text-gray-400 " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100"

interface Props {
  label: string
  htmlFor: string
  /** Guidance shown under the control. Reserves its line to avoid reflow. */
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, required, children, className }: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-gray-400">{hint}</p>}
    </div>
  )
}

/** Grouped settings block: white card, heading, body. */
export function Panel({
  title,
  description,
  children,
  footer,
}: {
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {title && (
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
          {footer}
        </div>
      )}
    </section>
  )
}
