'use client'

import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { cn } from '@/lib/utils'

/**
 * Full-page skeleton for initial data load. Use instead of a spinner for
 * consistent, content-shaped loading across list and detail pages.
 */
export function PageSkeleton({
  className,
  variant = 'list',
  showHeader = true,
  cardCount = 3,
}: {
  className?: string
  variant?: 'list' | 'hero' | 'kpi' | 'chart'
  showHeader?: boolean
  cardCount?: number
}) {
  return (
    <div className={cn('space-y-8', className)} aria-label="Loading">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="h-9 w-48 rounded-md bg-[var(--cp-bg-subtle)] animate-pulse motion-reduce:animate-none" />
            <div className="h-4 w-72 max-w-full rounded-md bg-[var(--cp-bg-subtle)] animate-pulse motion-reduce:animate-none" />
          </div>
          <div className="h-10 w-28 rounded-md bg-[var(--cp-bg-subtle)] animate-pulse motion-reduce:animate-none" />
        </div>
      )}
      <div className="space-y-6">
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonCard key={i} variant={variant} />
        ))}
      </div>
    </div>
  )
}
