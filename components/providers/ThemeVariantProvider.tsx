'use client'

import * as React from "react"

export type ThemeVariant = "blue" | "green" | "red" | "purple" | "amber" | "teal"

type VariantConfig = {
  primary: string
  strong: string
  soft: string
  subtle: string
  muted: string
}

const VARIANT_COLORS: Record<ThemeVariant, VariantConfig> = {
  blue: {
    primary: "#0ea5e9",
    strong: "#38bdf8",
    soft: "rgba(56, 189, 248, 0.16)",
    subtle: "rgba(56, 189, 248, 0.06)",
    muted: "rgba(56, 189, 248, 0.25)",
  },
  green: {
    primary: "#22c55e",
    strong: "#4ade80",
    soft: "rgba(34, 197, 94, 0.16)",
    subtle: "rgba(34, 197, 94, 0.06)",
    muted: "rgba(34, 197, 94, 0.25)",
  },
  red: {
    primary: "#ef4444",
    strong: "#f97373",
    soft: "rgba(239, 68, 68, 0.16)",
    subtle: "rgba(239, 68, 68, 0.06)",
    muted: "rgba(239, 68, 68, 0.25)",
  },
  purple: {
    primary: "#a855f7",
    strong: "#c4b5fd",
    soft: "rgba(168, 85, 247, 0.16)",
    subtle: "rgba(168, 85, 247, 0.06)",
    muted: "rgba(168, 85, 247, 0.25)",
  },
  amber: {
    primary: "#f59e0b",
    strong: "#fbbf24",
    soft: "rgba(245, 158, 11, 0.16)",
    subtle: "rgba(245, 158, 11, 0.06)",
    muted: "rgba(245, 158, 11, 0.25)",
  },
  teal: {
    primary: "#14b8a6",
    strong: "#2dd4bf",
    soft: "rgba(20, 184, 166, 0.16)",
    subtle: "rgba(20, 184, 166, 0.06)",
    muted: "rgba(20, 184, 166, 0.25)",
  },
}

type TintedNeutrals = { bgSubtle: string; borderSubtle: string }
const VARIANT_TINTED_NEUTRALS: Record<ThemeVariant, { dark: TintedNeutrals; light: TintedNeutrals }> = {
  blue: {
    dark: { bgSubtle: "#0f172a", borderSubtle: "#1e293b" },
    light: { bgSubtle: "#e2e8f0", borderSubtle: "#cbd5e1" },
  },
  green: {
    dark: { bgSubtle: "#0f1f12", borderSubtle: "#1e3324" },
    light: { bgSubtle: "#dcfce7", borderSubtle: "#bbf7d0" },
  },
  red: {
    dark: { bgSubtle: "#1f1212", borderSubtle: "#2e1e1e" },
    light: { bgSubtle: "#fee2e2", borderSubtle: "#fecaca" },
  },
  purple: {
    dark: { bgSubtle: "#1a0f2e", borderSubtle: "#251a3d" },
    light: { bgSubtle: "#f3e8ff", borderSubtle: "#e9d5ff" },
  },
  amber: {
    dark: { bgSubtle: "#1f1a0f", borderSubtle: "#2e281a" },
    light: { bgSubtle: "#fef3c7", borderSubtle: "#fde68a" },
  },
  teal: {
    dark: { bgSubtle: "#0f1f1f", borderSubtle: "#1e2e2e" },
    light: { bgSubtle: "#ccfbf1", borderSubtle: "#99f6e4" },
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
  root.style.setProperty("--cp-accent-primary-subtle", config.subtle)
  root.style.setProperty("--cp-accent-primary-muted", config.muted)

  const effective = root.getAttribute("data-theme") === "light" ? "light" : "dark"
  const tinted = VARIANT_TINTED_NEUTRALS[variant][effective]
  root.style.setProperty("--cp-bg-subtle", tinted.bgSubtle)
  root.style.setProperty("--cp-border-subtle", tinted.borderSubtle)
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

  // Load persisted variant and mode on mount (mode first so applyVariant can read data-theme for tinted neutrals)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY) as ThemeMode | null
    const initialMode = storedMode === "light" || storedMode === "dark" || storedMode === "system" ? storedMode : "dark"
    setModeState(initialMode)
    applyMode(initialMode)

    const storedVariant = window.localStorage.getItem(VARIANT_STORAGE_KEY) as ThemeVariant | null
    const initialVariant = storedVariant && VARIANT_COLORS[storedVariant] ? storedVariant : "blue"
    setVariantState(initialVariant)
    applyVariant(initialVariant)
  }, [])

  // React to system preference when mode is "system"; re-apply variant so tinted neutrals update
  React.useEffect(() => {
    if (mode !== "system" || typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handle = () => {
      applyMode("system")
      applyVariant(variant)
    }
    mq.addEventListener("change", handle)
    return () => mq.removeEventListener("change", handle)
  }, [mode, variant])

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
    applyVariant(variant)
  }, [variant])

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

