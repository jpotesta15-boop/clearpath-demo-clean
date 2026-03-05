'use client'

import * as React from "react"

export type ThemeVariant = "ocean" | "forest" | "sunset" | "slate"

type VariantConfig = {
  primary: string
  strong: string
  soft: string
  subtle: string
  muted: string
  secondary?: string
}

const VARIANT_COLORS: Record<ThemeVariant, VariantConfig> = {
  ocean: {
    primary: "#0ea5e9",
    strong: "#38bdf8",
    soft: "rgba(56, 189, 248, 0.16)",
    subtle: "rgba(56, 189, 248, 0.06)",
    muted: "rgba(56, 189, 248, 0.25)",
    secondary: "#14b8a6",
  },
  forest: {
    primary: "#22c55e",
    strong: "#4ade80",
    soft: "rgba(34, 197, 94, 0.16)",
    subtle: "rgba(34, 197, 94, 0.06)",
    muted: "rgba(34, 197, 94, 0.25)",
    secondary: "#2dd4bf",
  },
  sunset: {
    primary: "#f59e0b",
    strong: "#fbbf24",
    soft: "rgba(245, 158, 11, 0.16)",
    subtle: "rgba(245, 158, 11, 0.06)",
    muted: "rgba(245, 158, 11, 0.25)",
    secondary: "#ef4444",
  },
  slate: {
    primary: "#64748b",
    strong: "#94a3b8",
    soft: "rgba(100, 116, 139, 0.16)",
    subtle: "rgba(100, 116, 139, 0.06)",
    muted: "rgba(100, 116, 139, 0.25)",
    secondary: "#a78bfa",
  },
}

type TintedNeutrals = { bgSubtle: string; borderSubtle: string }
const VARIANT_TINTED_NEUTRALS: Record<ThemeVariant, { dark: TintedNeutrals; light: TintedNeutrals }> = {
  ocean: {
    dark: { bgSubtle: "#0f172a", borderSubtle: "#1e293b" },
    light: { bgSubtle: "#e2e8f0", borderSubtle: "#cbd5e1" },
  },
  forest: {
    dark: { bgSubtle: "#0f1f12", borderSubtle: "#1e3324" },
    light: { bgSubtle: "#dcfce7", borderSubtle: "#bbf7d0" },
  },
  sunset: {
    dark: { bgSubtle: "#1f1a0f", borderSubtle: "#2e281a" },
    light: { bgSubtle: "#fef3c7", borderSubtle: "#fde68a" },
  },
  slate: {
    dark: { bgSubtle: "#0f172a", borderSubtle: "#1e293b" },
    light: { bgSubtle: "#f1f5f9", borderSubtle: "#e2e8f0" },
  },
}

const LEGACY_VARIANT_MAP: Record<string, ThemeVariant> = {
  blue: "ocean",
  green: "forest",
  red: "sunset",
  purple: "slate",
  amber: "sunset",
  teal: "ocean",
}

const VARIANT_STORAGE_KEY = "cp-theme-variant"
export const THEME_MODE_STORAGE_KEY = "cp-theme-mode"

export type ThemeMode = "light" | "dark"

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
  if (config.secondary) {
    root.style.setProperty("--cp-accent-secondary", config.secondary)
  }

  const effective = root.getAttribute("data-theme") === "light" ? "light" : "dark"
  const tinted = VARIANT_TINTED_NEUTRALS[variant][effective]
  root.style.setProperty("--cp-bg-subtle", tinted.bgSubtle)
  root.style.setProperty("--cp-border-subtle", tinted.borderSubtle)
}

function applyMode(mode: ThemeMode) {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-theme", mode)
}

export function ThemeVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariantState] = React.useState<ThemeVariant>("ocean")
  const [mode, setModeState] = React.useState<ThemeMode>("dark")

  // Load persisted variant and mode on mount (mode first so applyVariant can read data-theme for tinted neutrals)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY) as string | null
    const initialMode = storedMode === "light" ? "light" : "dark"
    setModeState(initialMode)
    applyMode(initialMode)

    const storedVariant = window.localStorage.getItem(VARIANT_STORAGE_KEY) as string | null
    const resolvedVariant =
      storedVariant && VARIANT_COLORS[storedVariant as ThemeVariant]
        ? (storedVariant as ThemeVariant)
        : LEGACY_VARIANT_MAP[storedVariant ?? ""] ?? "ocean"
    setVariantState(resolvedVariant)
    applyVariant(resolvedVariant)
  }, [])

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

