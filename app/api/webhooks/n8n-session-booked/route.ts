import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { n8nSessionBookedSchema } from '@/lib/validations'
import { notifySessionBooked } from '@/lib/notify-session-booked'

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

  const forwarded = await notifySessionBooked(
    session_id,
    coach_id,
    client_id,
    scheduled_time,
    'booked'
  )

  return NextResponse.json({ ok: true, forwarded })
}
