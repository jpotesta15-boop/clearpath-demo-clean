import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export type ButtonVariant = "default" | "outline" | "ghost"
export type ButtonSize = "default" | "sm" | "lg"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const baseButtonClasses =
  "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cp-border-focus)] focus-visible:ring-offset-[var(--cp-bg-page)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]"

const variantClasses: Record<ButtonVariant, string> = {
  // Primary action
  default:
    "border border-transparent bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]",
  // Secondary action
  outline:
    "border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] text-[var(--cp-text-primary)] hover:bg-[var(--cp-bg-subtle)]",
  // Text / ghost button
  ghost:
    "border border-transparent text-[var(--cp-text-muted)] hover:bg-[var(--cp-accent-primary-subtle)]",
}

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-9 px-3 text-xs",
  lg: "h-11 px-5 text-base",
}

export function buttonClasses(options?: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}) {
  const { variant = "default", size = "default", className } = options ?? {}
  return cn(baseButtonClasses, variantClasses[variant], sizeClasses[size], className)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref as any}
        className={buttonClasses({ variant, size, className })}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button }

