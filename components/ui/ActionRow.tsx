import * as React from "react"
import { cn } from "@/lib/utils"

type Justify = "start" | "end" | "between"

interface ActionRowProps {
  children: React.ReactNode
  justify?: Justify
  className?: string
}

export function ActionRow({ children, justify = "end", className }: ActionRowProps) {
  const justifyClass =
    justify === "start"
      ? "justify-start"
      : justify === "between"
        ? "justify-between"
        : "justify-end"

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-2",
        justifyClass,
        className
      )}
    >
      {children}
    </div>
  )
}

