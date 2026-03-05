import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { n8nSessionBookedSchema } from '@/lib/validations'
import { getSafeMessage, logServerError } from '@/lib/api-error'

const N8N_URL = process.env.N8N_SESSION_BOOKED_WEBHOOK_URL

/**
 * Called by the app when a session is confirmed (booked).
 * Forwards payload to n8n webhook if N8N_SESSION_BOOKED_WEBHOOK_URL is set.
 * n8n can then send alerts to coach and client.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = n8nSessionBookedSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const { session_id, coach_id, client_id, scheduled_time } = parsed.data

  if (coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: clientRow } = await supabase
    .from('clients')
    .select('email, full_name')
    .eq('id', client_id)
    .single()

  const { data: coachRow } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', coach_id)
    .single()

  const payload = {
    session_id,
    coach_id,
    client_id,
    scheduled_time,
    client_email: clientRow?.email ?? null,
    client_name: clientRow?.full_name ?? null,
    coach_name: coachRow?.full_name ?? null,
    coach_email: coachRow?.email ?? null,
  }

  if (!N8N_URL) {
    return NextResponse.json({ ok: true, forwarded: false })
  }

  try {
    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error('[n8n-session-booked] Forward failed:', res.status, text)
      return NextResponse.json(
        { error: 'Webhook forward failed', status: res.status },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, forwarded: true })
  } catch (err) {
    logServerError('n8n-session-booked', err)
    return NextResponse.json({ error: getSafeMessage(502) }, { status: 502 })
  }
}
