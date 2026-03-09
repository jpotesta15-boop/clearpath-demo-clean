import * as React from "react"
import { cn } from "@/lib/utils"

export interface AppLayoutProps {
  children: React.ReactNode
  /**
   * Optional additional classes for the main content wrapper.
   * Use this for page-specific tweaks while preserving the core grid.
   */
  className?: string
}

/**
 * AppLayout
 *
 * Centralized content wrapper used across coach, client, and public pages.
 * It standardizes the core page grid:
 * - max-width container
 * - responsive horizontal padding
 * - consistent vertical rhythm
 */
export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <main
      className={cn(
        "flex-1 min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:py-10 space-y-6",
        className
      )}
    >
      {children}
    </main>
  )
}

