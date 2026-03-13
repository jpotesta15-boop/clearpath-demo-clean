/**
 * Supabase Database Webhook: when a row is INSERTed into `sessions` with
 * status 'confirmed', this route triggers the n8n session-booked webhook.
 * Configure in Supabase: Integrations → Webhooks → Add webhook on table `sessions`,
 * Event INSERT, URL = https://YOUR_APP_URL/api/webhooks/session-created,
 * Header: Authorization: Bearer SUPABASE_SESSION_WEBHOOK_SECRET
 */
import { NextResponse } from 'next/server'
import { notifySessionBooked } from '@/lib/notify-session-booked'

const secret = process.env.SUPABASE_SESSION_WEBHOOK_SECRET

function isSupabasePayload(
  body: unknown
): body is { type: string; table: string; record: Record<string, unknown> } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'type' in body &&
    'table' in body &&
    'record' in body &&
    typeof (body as any).record === 'object'
  )
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const headerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-session-webhook-secret')

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isSupabasePayload(body) || body.type !== 'INSERT' || body.table !== 'sessions') {
    return NextResponse.json({ ok: true, skipped: 'not a sessions INSERT' })
  }

  const record = body.record as {
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
    return NextResponse.json({ ok: true, skipped: 'missing required fields or not confirmed' })
  }

  await notifySessionBooked(
    record.id,
    record.coach_id,
    record.client_id,
    record.scheduled_time,
    'booked'
  )

  return NextResponse.json({ ok: true, forwarded: true })
}
