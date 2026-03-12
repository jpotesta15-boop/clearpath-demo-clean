import * as React from "react"
import { cn } from "@/lib/utils"

type StatusKind = "success" | "warning" | "danger" | "info" | "neutral"

interface StatusBadgeProps {
  status: StatusKind
  label: string
  className?: string
}

const statusClasses: Record<StatusKind, string> = {
  success: "bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]",
  warning: "bg-[var(--cp-accent-warning)]/20 text-[var(--cp-accent-warning)]",
  danger: "bg-[var(--cp-accent-danger)]/20 text-[var(--cp-accent-danger)]",
  info: "bg-[var(--cp-accent-primary)]/15 text-[var(--cp-accent-primary)]",
  neutral: "bg-[var(--cp-bg-subtle)] text-[var(--cp-text-muted)]",
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
        statusClasses[status],
        className
      )}
    >
      {label}
    </span>
  )
}

