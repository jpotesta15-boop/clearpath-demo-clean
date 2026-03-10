/**
 * Manual "Remind client" – sends on-demand session reminder via n8n.
 * Coach only; session must belong to coach and be confirmed + in the future.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getSafeMessage, logServerError } from '@/lib/api-error'
import { normalizePhone } from '@/lib/phone'

const N8N_URL = process.env.N8N_SESSION_REMINDER_ON_DEMAND_URL

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
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

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, coach_id, client_id, scheduled_time, status')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (session.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'Session is no longer active' },
      { status: 400 }
    )
  }

  const now = new Date()
  const scheduled = new Date(session.scheduled_time)
  if (scheduled <= now) {
    return NextResponse.json(
      { error: 'Session has already passed' },
      { status: 400 }
    )
  }

  const { data: clientRow } = await supabase
    .from('clients')
    .select('email, full_name, phone')
    .eq('id', session.client_id)
    .single()

  const { data: coachRow } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', session.coach_id)
    .single()

  const payload = {
    session_id: session.id,
    coach_id: session.coach_id,
    client_id: session.client_id,
    scheduled_time: session.scheduled_time,
    type: 'reminder',
    client_email: clientRow?.email ?? null,
    client_name: clientRow?.full_name ?? null,
    client_phone: normalizePhone(clientRow?.phone) ?? null,
    coach_name: coachRow?.full_name ?? null,
    coach_email: coachRow?.email ?? null,
    coach_phone: normalizePhone((coachRow as { phone?: string })?.phone) ?? null,
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
      console.error('[send-reminder] Forward failed:', res.status, text)
      return NextResponse.json(
        { error: getSafeMessage(502, 'Could not send reminder. Try again later.') },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, forwarded: true })
  } catch (err) {
    logServerError('send-reminder', err)
    return NextResponse.json(
      { error: getSafeMessage(502, 'Could not send reminder. Try again later.') },
      { status: 502 }
    )
  }
}
