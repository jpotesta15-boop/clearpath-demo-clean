/**
 * Server-only: resolve organization (coach) brand for layouts and white-label UI.
 * Use createClient() from @/lib/supabase/server so RLS applies.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeOrgBrand,
  getTerminology,
  getPortalNavEnabled,
  type OrgBrand,
  type CoachEmailSettings,
  type PortalCustomization,
  type BrandRow,
  type ProfileBrandRow,
} from '@/lib/white-label'

/**
 * Fetch brand for a coach (use in coach layout with user.id, or when you have coach_id).
 */
export async function getCoachBrand(
  supabase: SupabaseClient,
  coachId: string,
  fallbackName?: string
): Promise<OrgBrand | null> {
  const [brandRes, profileRes] = await Promise.all([
    supabase
      .from('coach_brand_settings')
      .select('logo_url, app_icon_url, primary_color, secondary_color, accent_color, background_color, brand_name, favicon_url, white_label')
      .eq('coach_id', coachId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('display_name, full_name, logo_url')
      .eq('id', coachId)
      .single(),
  ])

  const brand = brandRes.data as BrandRow | null
  const profile = profileRes.data as ProfileBrandRow | null
  return normalizeOrgBrand(brand, profile, fallbackName ?? 'ClearPath')
}

/**
 * Fetch email settings for a coach.
 */
export async function getCoachEmailSettings(
  supabase: SupabaseClient,
  coachId: string
): Promise<CoachEmailSettings | null> {
  const { data } = await supabase
    .from('coach_email_settings')
    .select('sender_name, sender_email, email_logo_url, footer_text')
    .eq('coach_id', coachId)
    .maybeSingle()

  if (!data) return null
  return {
    senderName: data.sender_name ?? null,
    senderEmail: data.sender_email ?? null,
    emailLogoUrl: data.email_logo_url ?? null,
    footerText: data.footer_text ?? null,
  }
}

/**
 * Fetch portal customization (welcome, nav, terminology) for a coach.
 */
export async function getPortalCustomization(
  supabase: SupabaseClient,
  coachId: string,
  tenantId: string
): Promise<PortalCustomization> {
  const { data } = await supabase
    .from('coach_client_experience')
    .select('welcome_title, welcome_body, portal_nav_enabled, portal_booking_instructions, terminology')
    .eq('coach_id', coachId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const raw = data as {
    welcome_title?: string | null
    welcome_body?: string | null
    portal_nav_enabled?: unknown
    portal_booking_instructions?: string | null
    terminology?: Record<string, string> | null
  } | null

  return {
    welcomeTitle: raw?.welcome_title ?? null,
    welcomeBody: raw?.welcome_body ?? null,
    bookingInstructions: raw?.portal_booking_instructions ?? null,
    portalNavEnabled: getPortalNavEnabled(raw?.portal_nav_enabled),
    terminology: getTerminology(raw?.terminology ?? null),
  }
}
