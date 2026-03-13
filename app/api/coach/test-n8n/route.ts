/**
 * Test n8n connection: POST a minimal payload to N8N_SESSION_BOOKED_WEBHOOK_URL.
 * Coach only. Use to verify env var and webhook URL work before booking real sessions.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const N8N_URL = process.env.N8N_SESSION_BOOKED_WEBHOOK_URL

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  if (!N8N_URL) {
    return NextResponse.json({
      ok: false,
      error: 'N8N_SESSION_BOOKED_WEBHOOK_URL is not set',
      hint: 'Add it in Vercel (Settings → Environment Variables) or .env.local, then redeploy or restart.',
    }, { status: 200 })
  }

  try {
    const res = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booked',
        session_id: 'test-connection',
        coach_id: user.id,
        client_id: user.id,
        scheduled_time: new Date().toISOString(),
        client_name: 'Test Client',
        client_email: null,
        client_phone: null,
        coach_name: profile?.role ?? 'Coach',
        coach_email: user.email ?? null,
        coach_phone: null,
      }),
    })

    const text = await res.text()

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `n8n responded ${res.status}`,
        detail: text.slice(0, 200),
        hint: res.status === 404 ? 'Use Production webhook URL (not webhook-test) and activate the workflow in n8n.' : 'Check n8n workflow and URL.',
      }, { status: 200 })
    }

    return NextResponse.json({
      ok: true,
      message: 'n8n connection OK',
      status: res.status,
      hint: 'When you add someone to the calendar, the same URL will be called with real session data.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      ok: false,
      error: 'Request failed',
      detail: message,
      hint: 'Check URL is correct and n8n is reachable from this server.',
    }, { status: 200 })
  }
}
