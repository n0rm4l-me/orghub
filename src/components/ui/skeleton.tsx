import { cn } from "@/lib/utils"

/**
 * Shimmering placeholder. Dimensions come from the caller so each skeleton can
 * mirror the real element's footprint and avoid layout shift on hydration.
 *
 * The fill is a tint of the foreground rather than `--muted`, which sits too
 * close to the card in light mode for a placeholder to read at all.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-foreground/10", className)}
      {...props}
    />
  )
}
