/**
 * Validate required environment variables at runtime.
 * Call from API routes or a startup hook so missing vars fail fast.
 */

const REQUIRED_SERVER = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const REQUIRED_FOR_SERVICE = ['SUPABASE_SERVICE_ROLE_KEY'] as const
const REQUIRED_FOR_STRIPE = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const

export function validateEnv(): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = []
  for (const key of REQUIRED_SERVER) {
    if (!process.env[key]?.trim()) missing.push(key)
  }
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true }
}

export function validateServiceRoleEnv(): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = []
  for (const key of REQUIRED_FOR_SERVICE) {
    if (!process.env[key]?.trim()) missing.push(key)
  }
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true }
}

export function validateStripeEnv(): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = []
  for (const key of REQUIRED_FOR_STRIPE) {
    if (!process.env[key]?.trim()) missing.push(key)
  }
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true }
}
