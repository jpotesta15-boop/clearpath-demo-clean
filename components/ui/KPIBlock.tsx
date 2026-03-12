import * as React from "react"
import { cn } from "@/lib/utils"

interface KPIBlockProps {
  label: string
  value: string | number
  helperText?: string
  className?: string
}

export function KPIBlock({ label, value, helperText, className }: KPIBlockProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-4 shadow-[var(--cp-shadow-soft)]",
        className
      )}
    >
      <p className="text-xs font-medium text-[var(--cp-text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--cp-text-primary)]">
        {value}
      </p>
      {helperText && (
        <p className="mt-0.5 text-[10px] text-[var(--cp-text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  )
}

