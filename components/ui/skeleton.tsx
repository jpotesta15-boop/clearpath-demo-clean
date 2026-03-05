import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skeleton placeholder for loading states. Uses a subtle pulse animation.
 * Respects prefers-reduced-motion (Tailwind motion-reduce:animate-none).
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-[var(--cp-bg-subtle)] animate-pulse motion-reduce:animate-none",
        className
      )}
      aria-hidden
      {...props}
    />
  )
}

export function SkeletonLine({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-[var(--cp-border-subtle)] p-6 space-y-3", className)} {...props}>
      <Skeleton className="h-5 w-1/3" />
      <SkeletonLine />
      <SkeletonLine className="max-w-[80%]" />
      <SkeletonLine className="max-w-[40%]" />
    </div>
  )
}

