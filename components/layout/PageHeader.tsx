import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  /**
   * Optional right-aligned primary action (e.g. Add client button).
   */
  primaryAction?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, primaryAction, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--cp-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {primaryAction && (
        <div className="flex items-center gap-2">
          {primaryAction}
        </div>
      )}
    </div>
  )
}

