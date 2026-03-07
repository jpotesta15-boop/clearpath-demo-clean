/**
 * Shared helper to notify n8n when a session is booked, confirmed, or payment received.
 * Used by: Stripe webhook (payment_confirmed), n8n-session-booked route (booked), send-reminder (reminder).
 * Fire-and-forget: logs errors but does not throw.
 */
import { createServiceClient } from '@/lib/supabase/service'
import { normalizePhone } from '@/lib/phone'

const N8N_URL = process.env.N8N_SESSION_BOOKED_WEBHOOK_URL

export type SessionBookedType = 'booked' | 'reminder' | 'payment_confirmed'

export async function notifySessionBooked(
  sessionId: string,
  coachId: string,
  clientId: string,
  scheduledTime: string,
  type: SessionBookedType = 'booked'
): Promise<boolean> {
  if (!N8N_URL) return false

  try {
    const supabase = createServiceClient()
    const [clientRes, coachRes] = await Promise.all([
      supabase.from('clients').select('email, full_name, phone').eq('id', clientId).single(),
      supabase.from('profiles').select('full_name, email, phone').eq('id', coachId).single(),
    ])

    const clientRow = clientRes.data
    const coachRow = coachRes.data as { full_name?: string; email?: string; phone?: string } | null

    const payload = {
      session_id: sessionId,
      coach_id: coachId,
      client_id: clientId,
      scheduled_time: scheduledTime,
      type,
      client_email: clientRow?.email ?? null,
      client_name: clientRow?.full_name ?? null,
      client_phone: normalizePhone(clientRow?.phone) ?? null,
      coach_name: coachRow?.full_name ?? null,
      coach_email: coachRow?.email ?? null,
      coach_phone: normalizePhone(coachRow?.phone) ?? null,
    }

    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[notify-session-booked] Forward failed:', res.status, text)
    }
    return true
  } catch (err) {
    console.error('[notify-session-booked]', err)
    return false
  }
}
