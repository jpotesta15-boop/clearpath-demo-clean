import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  /** Optional icon or illustration (e.g. SVG). Defaults to a simple inlay icon. */
  icon?: React.ReactNode
  /** Short title (e.g. "No sessions yet") */
  title: string
  /** One or two sentences of guidance. */
  description?: string
  /** Optional primary action. */
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

const DefaultIcon = () => (
  <svg
    className="w-12 h-12 text-[var(--cp-text-subtle)]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.5m-2.5 0h-5M4 13V6a2 2 0 012-2h2.5a2 2 0 012 2v7M4 13h2.5m2.5 0h5"
    />
  </svg>
)

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-8 px-4 rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-subtle)]/50",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-3 flex justify-center">
        {icon ?? <DefaultIcon />}
      </div>
      <h3 className="text-base font-medium text-[var(--cp-text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--cp-text-muted)] max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center justify-center rounded-md font-medium h-10 px-4 text-sm border border-transparent bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cp-accent-primary-muted)] focus-visible:ring-offset-[var(--cp-bg-page)]"
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center justify-center rounded-md font-medium h-10 px-4 text-sm border border-transparent bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cp-accent-primary-muted)] focus-visible:ring-offset-[var(--cp-bg-page)]"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
