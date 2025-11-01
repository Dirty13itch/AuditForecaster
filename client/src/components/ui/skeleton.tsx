import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md",
        "bg-[hsl(var(--skeleton-base))]",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r",
        "before:from-transparent",
        "before:via-[hsl(var(--skeleton-shimmer))]",
        "before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
