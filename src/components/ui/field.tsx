import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

/** Shared input chrome so every text field in the app focuses identically. */
export const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-base sm:text-sm text-foreground " +
  "placeholder:text-muted-foreground/70 transition " +
  "hover:border-muted-foreground/40 " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "disabled:bg-muted disabled:text-muted-foreground " +
  "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20"

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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

/**
 * Grouped settings block: a `Card` with the page-level spacing (5) and an
 * optional heading and footer. A shorthand, not a second primitive: the card
 * chrome itself lives in `ui/card`.
 *
 * `text-base` cancels the card's own `text-sm` so body copy keeps following the
 * root font size, which the portal's font-size preference scales.
 */
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
    <Card className="gap-0 text-base [--card-spacing:--spacing(5)]">
      {title && (
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={title ? "pt-(--card-spacing)" : undefined}>{children}</CardContent>
      {footer && (
        <CardFooter className="justify-end gap-2 px-(--card-spacing) py-3">{footer}</CardFooter>
      )}
    </Card>
  )
}
