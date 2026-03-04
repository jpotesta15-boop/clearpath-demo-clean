import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function formatICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICalText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'coach') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const now = new Date()
  const oneYear = new Date(now)
  oneYear.setFullYear(oneYear.getFullYear() + 1)

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, scheduled_time, status, clients(full_name), availability_slots(start_time, end_time)')
    .eq('coach_id', user.id)
    .gte('scheduled_time', now.toISOString())
    .lte('scheduled_time', oneYear.toISOString())
    .order('scheduled_time', { ascending: true })

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('id, start_time, end_time')
    .eq('coach_id', user.id)
    .gte('start_time', now.toISOString())
    .lte('start_time', oneYear.toISOString())
    .order('start_time', { ascending: true })

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Clearpath//Schedule//EN',
    'CALSCALE:GREGORIAN',
  ]

  for (const s of sessions || []) {
    const start = new Date(s.scheduled_time)
    const slot = Array.isArray(s.availability_slots) ? s.availability_slots[0] : s.availability_slots
    const end = slot?.end_time ? new Date(slot.end_time) : new Date(start.getTime() + 60 * 60 * 1000)
    const clientName = (s.clients as { full_name?: string } | null)?.full_name ?? 'Session'
    const summary = `Session: ${escapeICalText(clientName)}`
    lines.push(
      'BEGIN:VEVENT',
      `UID:session-${s.id}@clearpath`,
      `DTSTAMP:${formatICalDate(now)}Z`,
      `DTSTART:${formatICalDate(start)}Z`,
      `DTEND:${formatICalDate(end)}Z`,
      `SUMMARY:${summary}`,
      `STATUS:${s.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT'
    )
  }

  for (const slot of slots || []) {
    const start = new Date(slot.start_time)
    const end = new Date(slot.end_time)
    lines.push(
      'BEGIN:VEVENT',
      `UID:slot-${slot.id}@clearpath`,
      `DTSTAMP:${formatICalDate(now)}Z`,
      `DTSTART:${formatICalDate(start)}Z`,
      `DTEND:${formatICalDate(end)}Z`,
      'SUMMARY:Availability',
      'STATUS:TENTATIVE',
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="schedule.ics"',
    },
  })
}
