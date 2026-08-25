import { cn } from "@/lib/utils"

/**
 * Shimmering placeholder. Dimensions come from the caller so each skeleton can
 * mirror the real element's footprint and avoid layout shift on hydration.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-gray-200/70", className)}
      {...props}
    />
  )
}

/** Repeated text lines, last one short so it reads as a paragraph. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </div>
  )
}
