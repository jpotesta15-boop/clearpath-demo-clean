'use client'

import * as React from 'react'
import type { OrgBrand } from '@/lib/white-label'

export interface BrandThemeProviderProps {
  brand: OrgBrand
  children: React.ReactNode
}

/**
 * Injects organization brand colors into CSS variables so semantic tokens
 * (--cp-accent-primary, etc.) resolve to the coach's brand.
 */
export function BrandThemeProvider({ brand, children }: BrandThemeProviderProps) {
  const style = React.useMemo(
    () =>
      ({
        '--cp-brand-primary': brand.primaryColor,
        '--cp-brand-secondary': brand.secondaryColor,
        '--cp-accent-primary': brand.primaryColor,
        '--cp-accent-primary-strong': brand.secondaryColor,
        '--cp-accent-primary-soft': hexToRgba(brand.primaryColor, 0.16),
        '--cp-accent-primary-subtle': hexToRgba(brand.primaryColor, 0.06),
        '--cp-accent-primary-muted': hexToRgba(brand.secondaryColor ?? brand.primaryColor, 0.25),
        ...(brand.backgroundColor
          ? { '--cp-bg-page': brand.backgroundColor, '--cp-bg-surface': brand.backgroundColor }
          : {}),
      }) as React.CSSProperties,
    [
      brand.primaryColor,
      brand.secondaryColor,
      brand.accentColor,
      brand.backgroundColor,
    ]
  )

  return <div style={style}>{children}</div>
}

function hexToRgba(hex: string, alpha: number): string {
  const match = hex.replace(/^#/, '').match(/(.{2})(.{2})(.{2})/)
  if (!match) return hex
  const r = parseInt(match[1], 16)
  const g = parseInt(match[2], 16)
  const b = parseInt(match[3], 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
