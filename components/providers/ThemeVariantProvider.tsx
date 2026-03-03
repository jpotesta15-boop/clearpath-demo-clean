'use client'

import * as React from "react"

export type ThemeVariant = "blue" | "green" | "red" | "purple"

type VariantConfig = {
  primary: string
  strong: string
  soft: string
}

const VARIANT_COLORS: Record<ThemeVariant, VariantConfig> = {
  blue: {
    primary: "#0ea5e9",
    strong: "#38bdf8",
    soft: "rgba(56, 189, 248, 0.16)",
  },
  green: {
    primary: "#22c55e",
    strong: "#4ade80",
    soft: "rgba(34, 197, 94, 0.16)",
  },
  red: {
    primary: "#ef4444",
    strong: "#f97373",
    soft: "rgba(239, 68, 68, 0.16)",
  },
  purple: {
    primary: "#a855f7",
    strong: "#c4b5fd",
    soft: "rgba(168, 85, 247, 0.16)",
  },
}

const VARIANT_STORAGE_KEY = "cp-theme-variant"

interface ThemeVariantContextValue {
  variant: ThemeVariant
  setVariant: (variant: ThemeVariant) => void
}

const ThemeVariantContext = React.createContext<ThemeVariantContextValue | undefined>(
  undefined
)

function applyVariant(variant: ThemeVariant) {
  if (typeof document === "undefined") return
  const config = VARIANT_COLORS[variant]
  const root = document.documentElement

  root.style.setProperty("--cp-accent-primary", config.primary)
  root.style.setProperty("--cp-accent-primary-strong", config.strong)
  root.style.setProperty("--cp-accent-primary-soft", config.soft)
}

export function ThemeVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariantState] = React.useState<ThemeVariant>("blue")

  // Load persisted variant on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(VARIANT_STORAGE_KEY) as ThemeVariant | null
    const initial = stored && VARIANT_COLORS[stored] ? stored : "blue"
    setVariantState(initial)
    applyVariant(initial)
  }, [])

  const setVariant = React.useCallback((next: ThemeVariant) => {
    setVariantState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VARIANT_STORAGE_KEY, next)
    }
    applyVariant(next)
  }, [])

  const value = React.useMemo(
    () => ({ variant, setVariant }),
    [variant, setVariant]
  )

  return (
    <ThemeVariantContext.Provider value={value}>
      {children}
    </ThemeVariantContext.Provider>
  )
}

export function useThemeVariant(): ThemeVariantContextValue {
  const ctx = React.useContext(ThemeVariantContext)
  if (!ctx) {
    throw new Error("useThemeVariant must be used within a ThemeVariantProvider")
  }
  return ctx
}

