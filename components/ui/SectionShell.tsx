import * as React from "react"
import { cn } from "@/lib/utils"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { SkeletonCard } from "@/components/ui/SkeletonCard"
import { Button } from "@/components/ui/button"

export type SectionState = "loading" | "empty" | "error" | "ready"

interface SectionShellProps {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  state?: SectionState
  errorMessage?: string | null
  onRetry?: () => void
  /**
   * Optional empty-state content rendered when state === "empty".
   * If not provided, the section will simply render nothing in that case.
   */
  emptyContent?: React.ReactNode
  /**
   * Main section content, rendered when state === "ready".
   */
  children?: React.ReactNode
  className?: string
  contentClassName?: string
  skeletonVariant?: "hero" | "kpi" | "list" | "chart"
}

export function SectionShell({
  title,
  subtitle,
  meta,
  state = "ready",
  errorMessage,
  onRetry,
  emptyContent,
  children,
  className,
  contentClassName,
  skeletonVariant = "list",
}: SectionShellProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <SectionHeader title={title} subtitle={subtitle} meta={meta} />

      <div className={cn("min-h-[40px]", contentClassName)}>
        {state === "loading" && <SkeletonCard variant={skeletonVariant} />}

        {state === "error" && (
          <div className="rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--cp-accent-danger)]">
              {errorMessage || "Something went wrong loading this section."}
            </p>
            {onRetry && (
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        )}

        {state === "empty" && emptyContent}

        {state === "ready" && children}
      </div>
    </section>
  )
}

