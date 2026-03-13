/**
 * Supabase Database Webhook: when a row is INSERTed into `sessions` with
 * status 'confirmed', this route triggers the n8n session-booked webhook.
 * Configure in Supabase: Integrations → Webhooks → Add webhook on table `sessions`,
 * Event INSERT, URL = https://YOUR_APP_URL/api/webhooks/session-created
 * Auth: set header "Authorization: Bearer SUPABASE_SESSION_WEBHOOK_SECRET", or
 * use query param: ?secret=SUPABASE_SESSION_WEBHOOK_SECRET (if Supabase can't send headers).
 */
import { NextResponse } from 'next/server'
import { notifySessionBooked } from '@/lib/notify-session-booked'

const secret = process.env.SUPABASE_SESSION_WEBHOOK_SECRET

/** GET with ?secret=XXX returns 200 if endpoint is live and secret is correct (for quick testing). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')
  if (!secret || querySecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized', hint: 'Add ?secret=YOUR_SUPABASE_SESSION_WEBHOOK_SECRET' }, { status: 401 })
  }
  return NextResponse.json({
    ok: true,
    message: 'session-created webhook endpoint is live. POST from Supabase with INSERT on sessions table.',
  })
}

function isSupabasePayload(
  body: unknown
): body is { type: string; table: string; record?: Record<string, unknown>; new?: Record<string, unknown> } {
  if (typeof body !== 'object' || body === null || !('type' in body) || !('table' in body)) return false
  const b = body as any
  return (typeof b.record === 'object' && b.record !== null) || (typeof b.new === 'object' && b.new !== null)
}

function getRecord(body: { record?: Record<string, unknown>; new?: Record<string, unknown> }): Record<string, unknown> {
  return (body.record ?? body.new)!
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get('authorization')
  const headerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-session-webhook-secret')
  const querySecret = searchParams.get('secret')

  const providedSecret = headerSecret || querySecret

  if (!secret || providedSecret !== secret) {
    console.log('[session-created] Unauthorized: secret missing or mismatch (header=%s, query=%s)', !!headerSecret, !!querySecret)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (e) {
    console.log('[session-created] Invalid JSON:', e)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isSupabasePayload(body) || body.type !== 'INSERT' || body.table !== 'sessions') {
    const b = body as any
    console.log('[session-created] Skipped: type=%s table=%s keys=%s', b?.type, b?.table, b ? Object.keys(b).join(',') : 'none')
    return NextResponse.json({ ok: true, skipped: 'not a sessions INSERT' })
  }

  const record = getRecord(body) as {
    id?: string
    coach_id?: string
    client_id?: string
    scheduled_time?: string
    status?: string
  }

  if (
    record.status !== 'confirmed' ||
    !record.id ||
    !record.coach_id ||
    !record.client_id ||
    !record.scheduled_time
  ) {
    console.log('[session-created] Skipped: status=%s id=%s', record.status, record.id)
    return NextResponse.json({ ok: true, skipped: 'missing required fields or not confirmed' })
  }

  console.log('[session-created] Forwarding to n8n session_id=%s', record.id)
  await notifySessionBooked(
    record.id,
    record.coach_id,
    record.client_id,
    record.scheduled_time,
    'booked'
  )

  return NextResponse.json({ ok: true, forwarded: true })
}
