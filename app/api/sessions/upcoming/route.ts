/**
 * Returns sessions in the next 24 hours for n8n session reminder workflow.
 * Auth: Bearer N8N_SESSION_REMINDER_SECRET or N8N_VIDEO_WEBHOOK_SECRET
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const secret =
  process.env.N8N_SESSION_REMINDER_SECRET || process.env.N8N_VIDEO_WEBHOOK_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const headerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : request.headers.get('x-n8n-secret')

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const supabase = createServiceClient()
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, scheduled_time, coach_id, client_id')
    .eq('status', 'confirmed')
    .gte('scheduled_time', now.toISOString())
    .lte('scheduled_time', in24h.toISOString())
    .order('scheduled_time', { ascending: true })

  if (error) {
    console.error('[sessions/upcoming]', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  const list = sessions || []
  const coachIds = [...new Set(list.map((s: any) => s.coach_id))]
  const clientIds = [...new Set(list.map((s: any) => s.client_id))]

  const [coachRows, clientRows] = await Promise.all([
    coachIds.length > 0
      ? supabase.from('profiles').select('id, full_name, email').in('id', coachIds)
      : { data: [] },
    clientIds.length > 0
      ? supabase.from('clients').select('id, full_name, email').in('id', clientIds)
      : { data: [] },
  ])

  const coachMap = new Map((coachRows.data || []).map((p: any) => [p.id, p]))
  const clientMap = new Map((clientRows.data || []).map((c: any) => [c.id, c]))

  const payload = list.map((s: any) => {
    const coach = coachMap.get(s.coach_id)
    const client = clientMap.get(s.client_id)
    return {
      session_id: s.id,
      scheduled_time: s.scheduled_time,
      coach_id: s.coach_id,
      client_id: s.client_id,
      coach_name: coach?.full_name ?? null,
      coach_email: coach?.email ?? null,
      client_name: client?.full_name ?? null,
      client_email: client?.email ?? null,
    }
  })

  return NextResponse.json({ sessions: payload })
}
