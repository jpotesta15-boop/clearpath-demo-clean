'use client'

import * as React from "react"

export type ThemeVariant = "blue" | "orange" | "purple" | "red" | "green" | "neutral"

type VariantConfig = {
  primary: string
  strong: string
  light: string
  soft: string
  subtle: string
  muted: string
}

// Three shades per variant: primary (darkest), strong (mid), light (lightest). Single-hue only.
const VARIANT_COLORS: Record<ThemeVariant, VariantConfig> = {
  blue: {
    primary: "#0c4a6e",
    strong: "#0ea5e9",
    light: "#38bdf8",
    soft: "rgba(14, 165, 233, 0.16)",
    subtle: "rgba(14, 165, 233, 0.06)",
    muted: "rgba(56, 189, 248, 0.25)",
  },
  orange: {
    primary: "#c2410c",
    strong: "#ea580c",
    light: "#fb923c",
    soft: "rgba(234, 88, 12, 0.16)",
    subtle: "rgba(234, 88, 12, 0.06)",
    muted: "rgba(251, 146, 60, 0.25)",
  },
  purple: {
    primary: "#6b21a8",
    strong: "#9333ea",
    light: "#c084fc",
    soft: "rgba(147, 51, 234, 0.16)",
    subtle: "rgba(147, 51, 234, 0.06)",
    muted: "rgba(192, 132, 252, 0.25)",
  },
  red: {
    primary: "#b91c1c",
    strong: "#dc2626",
    light: "#f87171",
    soft: "rgba(220, 38, 38, 0.16)",
    subtle: "rgba(220, 38, 38, 0.06)",
    muted: "rgba(248, 113, 113, 0.25)",
  },
  green: {
    primary: "#15803d",
    strong: "#22c55e",
    light: "#4ade80",
    soft: "rgba(34, 197, 94, 0.16)",
    subtle: "rgba(34, 197, 94, 0.06)",
    muted: "rgba(74, 222, 128, 0.25)",
  },
  neutral: {
    primary: "#475569",
    strong: "#64748b",
    light: "#94a3b8",
    soft: "rgba(100, 116, 139, 0.16)",
    subtle: "rgba(100, 116, 139, 0.06)",
    muted: "rgba(148, 163, 184, 0.25)",
  },
}

export const VARIANT_SWATCH_COLORS: Record<ThemeVariant, [string, string, string]> = {
  blue: ["#0c4a6e", "#0ea5e9", "#38bdf8"],
  orange: ["#c2410c", "#ea580c", "#fb923c"],
  purple: ["#6b21a8", "#9333ea", "#c084fc"],
  red: ["#b91c1c", "#dc2626", "#f87171"],
  green: ["#15803d", "#22c55e", "#4ade80"],
  neutral: ["#475569", "#64748b", "#94a3b8"],
}

type TintedNeutrals = { bgSubtle: string; borderSubtle: string }
const VARIANT_TINTED_NEUTRALS: Record<ThemeVariant, { dark: TintedNeutrals; light: TintedNeutrals }> = {
  blue: {
    dark: { bgSubtle: "#0f172a", borderSubtle: "#1e293b" },
    light: { bgSubtle: "#e0f2fe", borderSubtle: "#bae6fd" },
  },
  orange: {
    dark: { bgSubtle: "#1c1917", borderSubtle: "#292524" },
    light: { bgSubtle: "#fff7ed", borderSubtle: "#ffedd5" },
  },
  purple: {
    dark: { bgSubtle: "#1e1b4b", borderSubtle: "#312e81" },
    light: { bgSubtle: "#f5f3ff", borderSubtle: "#e9d5ff" },
  },
  red: {
    dark: { bgSubtle: "#1f1212", borderSubtle: "#2e1e1e" },
    light: { bgSubtle: "#fef2f2", borderSubtle: "#fecaca" },
  },
  green: {
    dark: { bgSubtle: "#0f1f12", borderSubtle: "#1e3324" },
    light: { bgSubtle: "#dcfce7", borderSubtle: "#bbf7d0" },
  },
  neutral: {
    dark: { bgSubtle: "#1e293b", borderSubtle: "#334155" },
    light: { bgSubtle: "#f1f5f9", borderSubtle: "#e2e8f0" },
  },
}

const LEGACY_VARIANT_MAP: Record<string, ThemeVariant> = {
  ocean: "blue",
  forest: "green",
  sunset: "orange",
  slate: "neutral",
  blue: "blue",
  green: "green",
  red: "red",
  purple: "purple",
  amber: "orange",
  teal: "blue",
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
  root.style.setProperty("--cp-accent-secondary", config.strong)

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
  const [variant, setVariantState] = React.useState<ThemeVariant>("blue")
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
        : LEGACY_VARIANT_MAP[storedVariant ?? ""] ?? "blue"
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

