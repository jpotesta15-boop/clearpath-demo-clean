/**
 * White-label branding types and server helpers.
 * Resolves organization (coach) brand from coach_brand_settings + profiles.
 */

export interface OrgBrand {
  name: string
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string | null
  whiteLabel: boolean
}

export interface CoachEmailSettings {
  senderName: string | null
  senderEmail: string | null
  emailLogoUrl: string | null
  footerText: string | null
}

export interface PortalCustomization {
  welcomeTitle: string | null
  welcomeBody: string | null
  bookingInstructions: string | null
  portalNavEnabled: string[]
  terminology: Record<string, string>
}

const DEFAULT_PRIMARY = '#0ea5e9'
const DEFAULT_SECONDARY = '#38bdf8'
const DEFAULT_ACCENT = '#0ea5e9'

export type BrandRow = {
  logo_url: string | null
  app_icon_url: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  background_color: string | null
  brand_name: string | null
  favicon_url: string | null
  white_label: boolean | null
}

export type ProfileBrandRow = {
  display_name: string | null
  full_name: string | null
  logo_url: string | null
}

/**
 * Normalize brand from DB rows into OrgBrand.
 */
export function normalizeOrgBrand(
  brand: BrandRow | null,
  profile: ProfileBrandRow | null,
  fallbackName: string = 'ClearPath'
): OrgBrand {
  const name =
    brand?.brand_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    fallbackName
  return {
    name,
    logoUrl: brand?.logo_url?.trim() || profile?.logo_url?.trim() || null,
    faviconUrl: brand?.favicon_url?.trim() || brand?.app_icon_url?.trim() || null,
    primaryColor: brand?.primary_color?.trim() || DEFAULT_PRIMARY,
    secondaryColor: brand?.secondary_color?.trim() || DEFAULT_SECONDARY,
    accentColor: brand?.accent_color?.trim() || DEFAULT_ACCENT,
    backgroundColor: brand?.background_color?.trim() || null,
    whiteLabel: brand?.white_label === true,
  }
}

/**
 * Default terminology (no overrides).
 */
export const DEFAULT_TERMINOLOGY: Record<string, string> = {
  client: 'Client',
  session: 'Session',
  coach: 'Coach',
  program: 'Program',
  video: 'Video',
}

/**
 * Get terminology map for a coach (client_experience.terminology).
 */
export function getTerminology(overrides: Record<string, string> | null): Record<string, string> {
  if (!overrides || typeof overrides !== 'object') return { ...DEFAULT_TERMINOLOGY }
  return { ...DEFAULT_TERMINOLOGY, ...overrides }
}

/**
 * Default portal nav sections (all enabled).
 */
export const DEFAULT_PORTAL_NAV = ['schedule', 'messages', 'programs', 'videos', 'payments'] as const

export function getPortalNavEnabled(value: unknown): string[] {
  if (Array.isArray(value) && value.every((x) => typeof x === 'string')) {
    return value as string[]
  }
  return [...DEFAULT_PORTAL_NAV]
}
