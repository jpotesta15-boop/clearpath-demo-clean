'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cp-bg-page)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

