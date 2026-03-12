'use client'

import { BrandThemeProvider } from './BrandThemeProvider'
import type { OrgBrand } from '@/lib/white-label'

export function ClientBrandWrapper({
  brand,
  children,
}: {
  brand: OrgBrand | null
  children: React.ReactNode
}) {
  if (!brand) return <>{children}</>
  return <BrandThemeProvider brand={brand}>{children}</BrandThemeProvider>
}
