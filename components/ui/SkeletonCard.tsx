import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type SkeletonVariant = "hero" | "kpi" | "list" | "chart"

interface SkeletonCardProps {
  variant?: SkeletonVariant
  className?: string
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-3 w-full rounded-full bg-[var(--cp-bg-subtle)] animate-pulse",
        className
      )}
    />
  )
}

export function SkeletonCard({ variant = "list", className }: SkeletonCardProps) {
  if (variant === "kpi") {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4", className)}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx}>
            <CardContent className="p-4 space-y-2">
              <SkeletonLine className="w-16" />
              <SkeletonLine className="w-20 h-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (variant === "hero") {
    return (
      <Card className={cn("shadow-[var(--cp-shadow-card)]", className)}>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <SkeletonLine className="w-24 h-3" />
          <SkeletonLine className="w-40 h-4" />
          <SkeletonLine className="w-56" />
          <div className="flex flex-wrap gap-3 pt-2">
            <SkeletonLine className="w-24 h-8 rounded-md" />
            <SkeletonLine className="w-24 h-8 rounded-md" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === "chart") {
    return (
      <Card className={cn("shadow-[var(--cp-shadow-card)]", className)}>
        <CardContent className="p-6 space-y-4">
          <SkeletonLine className="w-32 h-3" />
          <div className="h-40 w-full rounded-xl bg-[var(--cp-bg-subtle)] animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  // list
  return (
    <Card className={cn("shadow-[var(--cp-shadow-soft)]", className)}>
      <CardContent className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <SkeletonLine className="w-32" />
            <SkeletonLine className="w-48" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

