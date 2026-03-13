/**
 * Create a session and immediately trigger n8n (session booked).
 * Used when coach adds a client to the calendar – one call, session + notification.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createSessionSchema } from '@/lib/validations'
import { notifySessionBooked } from '@/lib/notify-session-booked'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSessionSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const {
    client_id,
    scheduled_time,
    tenant_id,
    session_request_id,
    session_product_id,
    amount_cents,
    notes,
  } = parsed.data

  const { data: newSession, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      coach_id: user.id,
      client_id,
      availability_slot_id: null,
      scheduled_time,
      status: 'confirmed',
      tenant_id,
      session_request_id: session_request_id ?? null,
      session_product_id: session_product_id ?? null,
      amount_cents: amount_cents ?? null,
      notes: notes?.trim() || null,
    })
    .select('id')
    .single()

  if (sessionError) {
    console.error('[coach/sessions] insert failed:', sessionError)
    return NextResponse.json(
      { error: sessionError.message ?? 'Could not create session' },
      { status: 500 }
    )
  }

  if (session_request_id) {
    await supabase
      .from('session_requests')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('id', session_request_id)
  }

  // Always call n8n when a session is added to the calendar
  await notifySessionBooked(newSession.id, user.id, client_id, scheduled_time, 'booked')

  return NextResponse.json({ id: newSession.id })
}
