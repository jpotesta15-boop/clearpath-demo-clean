import * as React from "react"

export interface ThemeProviderProps {
  children: React.ReactNode
  brandPrimary: string
  brandSecondary: string
}

/**
 * ThemeProvider
 *
 * Server-friendly provider that maps brand colors from ClientConfig into
 * CSS variables. Components then read from semantic tokens like
 * --cp-accent-primary, which are derived from these brand variables.
 */
export function ThemeProvider({
  children,
  brandPrimary,
  brandSecondary,
}: ThemeProviderProps) {
  const style = {
    // Brand color inputs
    "--cp-brand-primary": brandPrimary,
    "--cp-brand-secondary": brandSecondary,
  } as React.CSSProperties

  return (
    <div style={style}>
      {children}
    </div>
  )
}

