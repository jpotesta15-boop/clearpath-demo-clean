import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ListRowProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  leading?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

export function ListRow({
  title,
  subtitle,
  leading,
  meta,
  actions,
  href,
  onClick,
  className,
}: ListRowProps) {
  const interactive = !!href || !!onClick
  const content = (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 px-4 py-3",
        interactive && "cursor-pointer hover:bg-[var(--cp-bg-subtle)]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-[var(--cp-text-primary)]">
              {title}
            </p>
            {meta && (
              <div className="shrink-0">
                {meta}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-[var(--cp-text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cp-bg-page)]"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="block focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--cp-border-focus)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--cp-bg-page)]">
      {content}
    </div>
  )
}

