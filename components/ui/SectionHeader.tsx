import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, meta, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className
      )}
    >
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium text-[var(--cp-text-primary)]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-[var(--cp-text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {meta && (
        <div className="flex items-center gap-2">
          {meta}
        </div>
      )}
    </div>
  )
}

