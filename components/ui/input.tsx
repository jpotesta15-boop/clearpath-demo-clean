import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm text-[var(--cp-text-primary)] ring-offset-[var(--cp-bg-page)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--cp-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

