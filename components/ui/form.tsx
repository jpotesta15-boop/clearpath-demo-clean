import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function FormField({ className, ...props }: FormFieldProps) {
  return (
    <div
      className={cn("space-y-1.5", className)}
      {...props}
    />
  )
}

export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function FormLabel({ className, ...props }: FormLabelProps) {
  return (
    <label
      className={cn(
        "block text-sm font-medium text-[var(--cp-text-primary)]",
        className
      )}
      {...props}
    />
  )
}

export interface FormDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FormDescription({ className, ...props }: FormDescriptionProps) {
  return (
    <p
      className={cn(
        "text-xs text-[var(--cp-text-muted)]",
        className
      )}
      {...props}
    />
  )
}

export interface FormErrorProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FormError({ className, ...props }: FormErrorProps) {
  return (
    <p
      className={cn(
        "text-sm text-[var(--cp-accent-danger)]",
        className
      )}
      role="alert"
      {...props}
    />
  )
}

