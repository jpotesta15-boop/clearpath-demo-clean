'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { cardHoverTransition } from "@/lib/theme/animation"

export type CardVariant = "surface" | "raised" | "ghost"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /**
   * Enable subtle lift-on-hover interaction for clickable cards.
   */
  interactive?: boolean
}

// Use a loosely-typed MotionDiv to avoid prop type conflicts between
// React's HTML attributes and Framer Motion's drag handlers.
const MotionDiv: any = motion.div

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "surface", interactive = false, ...props }, ref) => {
    const baseClasses = cn(
      "border transition-shadow",
      variant === "raised" ? "rounded-2xl" : "rounded-lg",
      {
        // Default content surface; subtle accent tint for cohesion
        "border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] shadow-[var(--cp-shadow-soft)]":
          variant === "surface",
        // Elevated / primary tiles; left border accent + optional subtle bg tint
        "border-[var(--cp-border-strong)] border-l-[3px] border-l-[var(--cp-accent-primary-muted)] bg-[var(--cp-bg-elevated)] shadow-[var(--cp-shadow-card)]":
          variant === "raised",
        // Minimal / inline container
        "border-transparent bg-transparent shadow-none": variant === "ghost",
      },
      className
    )

    if (interactive && variant !== "ghost") {
      return (
        <MotionDiv
          ref={ref}
          className={baseClasses}
          whileHover={cardHoverTransition.hover}
          transition={cardHoverTransition.transition}
          {...props}
        />
      )
    }

    return (
      <div
        ref={ref}
        className={baseClasses}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-tight tracking-tight text-[var(--cp-text-primary)]",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }

