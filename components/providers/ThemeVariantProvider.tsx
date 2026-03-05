'use client'

import * as React from "react"

export type ThemeVariant = "blue" | "green" | "red" | "purple" | "amber" | "teal"

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
  amber: {
    primary: "#f59e0b",
    strong: "#fbbf24",
    soft: "rgba(245, 158, 11, 0.16)",
  },
  teal: {
    primary: "#14b8a6",
    strong: "#2dd4bf",
    soft: "rgba(20, 184, 166, 0.16)",
  },
}

const VARIANT_STORAGE_KEY = "cp-theme-variant"
export const THEME_MODE_STORAGE_KEY = "cp-theme-mode"

export type ThemeMode = "light" | "dark" | "system"

interface ThemeVariantContextValue {
  variant: ThemeVariant
  setVariant: (variant: ThemeVariant) => void
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
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

function resolveEffectiveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system" || typeof window === "undefined") return mode === "light" ? "light" : "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyMode(mode: ThemeMode) {
  if (typeof document === "undefined") return
  const effective = resolveEffectiveMode(mode)
  document.documentElement.setAttribute("data-theme", effective)
}

export function ThemeVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariantState] = React.useState<ThemeVariant>("blue")
  const [mode, setModeState] = React.useState<ThemeMode>("dark")

  // Load persisted variant and mode on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const storedVariant = window.localStorage.getItem(VARIANT_STORAGE_KEY) as ThemeVariant | null
    const initialVariant = storedVariant && VARIANT_COLORS[storedVariant] ? storedVariant : "blue"
    setVariantState(initialVariant)
    applyVariant(initialVariant)

    const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY) as ThemeMode | null
    const initialMode = storedMode === "light" || storedMode === "dark" || storedMode === "system" ? storedMode : "dark"
    setModeState(initialMode)
    applyMode(initialMode)
  }, [])

  // React to system preference when mode is "system"
  React.useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handle = () => applyMode("system")
    mq.addEventListener("change", handle)
    return () => mq.removeEventListener("change", handle)
  }, [mode])

  const setVariant = React.useCallback((next: ThemeVariant) => {
    setVariantState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VARIANT_STORAGE_KEY, next)
    }
    applyVariant(next)
  }, [])

  const setMode = React.useCallback((next: ThemeMode) => {
    setModeState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, next)
    }
    applyMode(next)
  }, [])

  const value = React.useMemo(
    () => ({ variant, setVariant, mode, setMode }),
    [variant, setVariant, mode, setMode]
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

