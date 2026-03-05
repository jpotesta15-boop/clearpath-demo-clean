import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cp-accent-primary-muted)] focus-visible:ring-offset-[var(--cp-bg-page)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            // Primary action: hover scale + brighter background
            "border border-transparent bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] hover:scale-[1.02]":
              variant === "default",
            // Secondary action: accent border and hover tint for palette consistency
            "border border-[var(--cp-accent-primary-muted)] bg-transparent text-[var(--cp-accent-primary)] hover:bg-[var(--cp-accent-primary-soft)] hover:scale-[1.02]":
              variant === "outline",
            // Text / ghost button
            "border border-transparent text-[var(--cp-text-muted)] hover:bg-[var(--cp-accent-primary-subtle)]":
              variant === "ghost",
            // Sizes
            "h-10 px-4 py-2 text-sm": size === "default",
            "h-9 px-3 text-xs": size === "sm",
            "h-11 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }

