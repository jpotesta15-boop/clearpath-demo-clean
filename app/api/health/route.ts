import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logServerError } from '@/lib/api-error'

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

/**
 * Readiness: required env present and DB reachable.
 * Returns 200 when ready, 503 when not (so orchestrators can fail deploy or not send traffic).
 */
export async function GET() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim())
  if (missing.length > 0) {
    logServerError('health', new Error('Missing required env'), { missing })
    return NextResponse.json(
      { ok: false, reason: 'missing_env', missing },
      { status: 503 }
    )
  }

  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
    if (error) {
      logServerError('health', error, { context: 'db_ping' })
      return NextResponse.json(
        { ok: false, reason: 'db_unavailable' },
        { status: 503 }
      )
    }
  } catch (err) {
    logServerError('health', err, { context: 'db_connect' })
    return NextResponse.json(
      { ok: false, reason: 'db_connect_failed' },
      { status: 503 }
    )
  }

  return NextResponse.json({ ok: true })
}
