'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { Input } from '@/components/ui/input'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
  addMinutes,
  parseISO,
} from 'date-fns'

type Slot = {
  id: string
  start_time: string
  end_time: string
  is_group_session: boolean
  max_participants: number
  session_product_id?: string | null
  label?: string | null
}

type Session = {
  id: string
  client_id: string
  availability_slot_id: string | null
  scheduled_time: string
  status: string
  paid_at: string | null
  notes?: string | null
  clients?: { full_name?: string } | null
  availability_slots?: { start_time: string; end_time: string } | null
}

type Client = {
  id: string
  full_name: string
  email?: string | null
}

function getSlotsForDay(slots: Slot[], day: Date): Slot[] {
  const dayStart = startOfDay(day).toISOString()
  const nextDay = new Date(day)
  nextDay.setDate(nextDay.getDate() + 1)
  const nextDayStart = startOfDay(nextDay).toISOString()
  return slots.filter((slot) => {
    const start = slot.start_time
    return start >= dayStart && start < nextDayStart
  })
}

function getSessionsForDay(sessions: Session[], day: Date): Session[] {
  return sessions.filter((s) => isSameDay(parseISO(s.scheduled_time), day))
}

const TIME_OPTIONS = (() => {
  const opts: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return opts
})()

const FIGHTER_COLORS = [
  'bg-[var(--cp-accent-primary-soft)] text-[var(--cp-accent-primary)] border-[var(--cp-accent-primary)]',
  'bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)] border-[var(--cp-accent-success)]',
  'bg-[var(--cp-accent-warning)]/20 text-[var(--cp-accent-warning)] border-[var(--cp-accent-warning)]',
  'bg-[var(--cp-accent-danger)]/20 text-[var(--cp-accent-danger)] border-[var(--cp-accent-danger)]',
]

function getFighterColor(clientId: string, clients: Client[]): string {
  const idx = clients.findIndex((c) => c.id === clientId)
  return FIGHTER_COLORS[idx >= 0 ? idx % FIGHTER_COLORS.length : 0]
}

function formatTimeOption(t: string): string {
  const [h, m] = t.split(':').map(Number)
  if (h === 0 && m === 0) return '12:00 AM'
  if (h < 12) return `${h}:${String(m).padStart(2, '0')} AM`
  if (h === 12) return `12:${String(m).padStart(2, '0')} PM`
  return `${h - 12}:${String(m).padStart(2, '0')} PM`
}

export default function SchedulePage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sessionProducts, setSessionProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(() => new Date())
  const [newSlot, setNewSlot] = useState({
    start_time: '',
    end_time: '',
    is_group_session: false,
    max_participants: 1,
    repeat: 'none' as 'none' | 'daily' | 'weekly',
    repeatEndDate: '',
    repeatCount: 4,
    is_paid_slot: false,
    session_product_id: '',
    label: '',
  })
  const [bookClient, setBookClient] = useState<Client | null>(null)
  const [bookForm, setBookForm] = useState({ date: '', startTime: '', endTime: '' })
  const [submitting, setSubmitting] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editForm, setEditForm] = useState({ date: '', startTime: '', endTime: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [sessionRequests, setSessionRequests] = useState<any[]>([])
  const [schedulingRequest, setSchedulingRequest] = useState<any>(null)
  const [schedulingSlotId, setSchedulingSlotId] = useState<string | null>(null)
  const [schedulingSubmitting, setSchedulingSubmitting] = useState(false)
  const [coachTimezone, setCoachTimezone] = useState<string | null>(null)
  const supabase = createClient()
  const tenantId = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'demo'

  const displayTz = coachTimezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC')

  function formatInTz(isoString: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }): string {
    return new Date(isoString).toLocaleString('en-US', { ...options, timeZone: displayTz })
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()
    if (profile?.timezone) setCoachTimezone(profile.timezone)

    const { data: slotsData } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('coach_id', user.id)
      .order('start_time', { ascending: true })

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, clients(*), availability_slots(*)')
      .eq('coach_id', user.id)
      .order('scheduled_time', { ascending: true })

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('coach_id', user.id)
      .order('full_name', { ascending: true })

    const { data: productsData } = await supabase
      .from('session_products')
      .select('*')
      .eq('coach_id', user.id)
      .eq('client_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const { data: requestsData } = await supabase
      .from('session_requests')
      .select('*, clients(*), session_products(name)')
      .eq('coach_id', user.id)
      .eq('status', 'availability_submitted')
      .order('created_at', { ascending: false })

    setSlots(slotsData || [])
    setSessions(sessionsData || [])
    setClients(clientsData || [])
    setSessionProducts(productsData || [])
    setSessionRequests(requestsData || [])
    setLoading(false)
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const start = new Date(newSlot.start_time)
    const end = new Date(newSlot.end_time)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return

    if (newSlot.is_paid_slot && !newSlot.session_product_id) {
      return
    }

    const durationMs = end.getTime() - start.getTime()
    const occurrences: { start_time: string; end_time: string }[] = []

    if (newSlot.repeat === 'none') {
      occurrences.push({ start_time: newSlot.start_time, end_time: newSlot.end_time })
    } else {
      const maxCount = 100
      let count = 0
      if (newSlot.repeat === 'daily') {
        const endDate = newSlot.repeatEndDate ? new Date(newSlot.repeatEndDate) : null
        const limit = endDate ? undefined : Math.min(newSlot.repeatCount, maxCount)
        let d = new Date(start)
        while ((!endDate || d <= endDate) && (limit === undefined || count < limit)) {
          const e = new Date(d.getTime() + durationMs)
          occurrences.push({ start_time: d.toISOString(), end_time: e.toISOString() })
          d.setDate(d.getDate() + 1)
          count++
          if (count >= maxCount) break
        }
      } else {
        const endDate = newSlot.repeatEndDate ? new Date(newSlot.repeatEndDate) : null
        const limit = endDate ? undefined : Math.min(newSlot.repeatCount, maxCount)
        let d = new Date(start)
        while ((!endDate || d <= endDate) && (limit === undefined || count < limit)) {
          const e = new Date(d.getTime() + durationMs)
          occurrences.push({ start_time: d.toISOString(), end_time: e.toISOString() })
          d.setDate(d.getDate() + 7)
          count++
          if (count >= maxCount) break
        }
      }
    }

    for (const occ of occurrences) {
      const { error } = await supabase.from('availability_slots').insert({
        coach_id: user.id,
        client_id: tenantId,
        start_time: occ.start_time,
        end_time: occ.end_time,
        is_group_session: newSlot.is_group_session,
        max_participants: newSlot.max_participants,
        session_product_id: newSlot.is_paid_slot ? newSlot.session_product_id : null,
        label: newSlot.is_paid_slot ? newSlot.label.trim() || null : null,
      })
      if (error) {
        loadData()
        return
      }
    }

    setShowForm(false)
    setNewSlot({
      start_time: '',
      end_time: '',
      is_group_session: false,
      max_participants: 1,
      repeat: 'none',
      repeatEndDate: '',
      repeatCount: 4,
      is_paid_slot: false,
      session_product_id: '',
      label: '',
    })
    loadData()
  }

  const handleApproveSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'confirmed' })
      .eq('id', sessionId)
    if (!error) loadData()
  }

  const notifySessionBooked = async (sessionId: string, coachId: string, clientId: string, scheduledTime: string) => {
    try {
      await fetch('/api/webhooks/n8n-session-booked', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          coach_id: coachId,
          client_id: clientId,
          scheduled_time: scheduledTime,
        }),
        credentials: 'include',
      })
    } catch {
      // non-blocking
    }
  }

  const handleScheduleRequestToSlot = async () => {
    if (!schedulingRequest || !schedulingSlotId) return
    const slot = slots.find((s) => s.id === schedulingSlotId)
    if (!slot) return
    setSchedulingSubmitting(true)
    const { data: newSession, error: sessionError } = await supabase.from('sessions').insert({
      coach_id: schedulingRequest.coach_id,
      client_id: schedulingRequest.client_id,
      availability_slot_id: schedulingSlotId,
      scheduled_time: slot.start_time,
      status: 'confirmed',
      tenant_id: schedulingRequest.tenant_id,
      session_request_id: schedulingRequest.id,
      session_product_id: schedulingRequest.session_product_id ?? null,
      amount_cents: schedulingRequest.amount_cents ?? null,
    }).select('id').single()
    if (!sessionError && newSession?.id) {
      await supabase
        .from('session_requests')
        .update({ status: 'scheduled', updated_at: new Date().toISOString() })
        .eq('id', schedulingRequest.id)
      notifySessionBooked(newSession.id, schedulingRequest.coach_id, schedulingRequest.client_id, slot.start_time)
      setSchedulingRequest(null)
      setSchedulingSlotId(null)
      loadData()
    }
    setSchedulingSubmitting(false)
  }

  const handleMarkAsPaid = async (sessionId: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ paid_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (!error) loadData()
  }

  const snapToTimeOption = (date: Date): string => {
    const h = date.getHours()
    const m = date.getMinutes()
    const snappedM = m < 30 ? 0 : 30
    return `${String(h).padStart(2, '0')}:${String(snappedM).padStart(2, '0')}`
  }

  const openEditSession = (session: Session) => {
    const start = parseISO(session.scheduled_time)
    const endFromSlot = session.availability_slots?.end_time
      ? parseISO(session.availability_slots.end_time)
      : addMinutes(start, 60)
    setEditingSession(session)
    setEditForm({
      date: format(start, 'yyyy-MM-dd'),
      startTime: TIME_OPTIONS.includes(format(start, 'HH:mm'))
        ? format(start, 'HH:mm')
        : snapToTimeOption(start),
      endTime: (() => {
        const endStr = format(endFromSlot, 'HH:mm')
        return TIME_OPTIONS.includes(endStr) ? endStr : snapToTimeOption(endFromSlot)
      })(),
      notes: session.notes ?? '',
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSession || savingEdit) return
    const startDateTime = new Date(`${editForm.date}T${editForm.startTime}`)
    const endDateTime = new Date(`${editForm.date}T${editForm.endTime}`)
    if (
      isNaN(startDateTime.getTime()) ||
      isNaN(endDateTime.getTime()) ||
      endDateTime <= startDateTime
    ) {
      return
    }
    if (!isSameDay(startDateTime, endDateTime)) return

    setSavingEdit(true)
    const start_time = startDateTime.toISOString()
    const end_time = endDateTime.toISOString()

    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        scheduled_time: start_time,
        notes: editForm.notes.trim() || null,
      })
      .eq('id', editingSession.id)

    if (!sessionError && editingSession.availability_slot_id) {
      await supabase
        .from('availability_slots')
        .update({ start_time, end_time })
        .eq('id', editingSession.availability_slot_id)
    }

    setSavingEdit(false)
    setEditingSession(null)
    loadData()
  }

  const handleDeleteSession = async () => {
    if (!editingSession || savingEdit) return
    setSavingEdit(true)
    const slotId = editingSession.availability_slot_id
    const { error } = await supabase.from('sessions').delete().eq('id', editingSession.id)
    if (!error && slotId) {
      await supabase.from('availability_slots').delete().eq('id', slotId)
    }
    setSavingEdit(false)
    setEditingSession(null)
    loadData()
  }

  const handleMarkCompleted = async () => {
    if (!editingSession || savingEdit) return
    setSavingEdit(true)
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', editingSession.id)
    setSavingEdit(false)
    setEditingSession(null)
    loadData()
  }

  const handleMarkCanceled = async () => {
    if (!editingSession || savingEdit) return
    setSavingEdit(true)
    await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', editingSession.id)
    setSavingEdit(false)
    setEditingSession(null)
    loadData()
  }

  const handleBookSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookClient || submitting) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Build start/end only from the selected date and time (single day only)
    const startDateTime = new Date(`${bookForm.date}T${bookForm.startTime}`)
    const endDateTime = new Date(`${bookForm.date}T${bookForm.endTime}`)
    const validTime = !isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime()) && endDateTime > startDateTime
    const sameDay = validTime && isSameDay(startDateTime, endDateTime)
    if (!validTime) return
    if (!isSameDay(startDateTime, endDateTime) || startOfDay(endDateTime).getTime() !== startOfDay(startDateTime).getTime()) return

    const start_time = startDateTime.toISOString()
    const end_time = endDateTime.toISOString()

    setSubmitting(true)
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .insert({
        coach_id: user.id,
        start_time,
        end_time,
        is_group_session: false,
        max_participants: 1,
        client_id: tenantId,
      })
      .select('id')
      .single()

    if (slotError || !slot) {
      setSubmitting(false)
      return
    }

    const { data: newSession, error: sessionError } = await supabase.from('sessions').insert({
      coach_id: user.id,
      client_id: bookClient.id,
      availability_slot_id: slot.id,
      scheduled_time: start_time,
      status: 'confirmed',
      tenant_id: tenantId,
    }).select('id').single()
    setSubmitting(false)
    if (!sessionError && newSession?.id) {
      notifySessionBooked(newSession.id, user.id, bookClient.id, start_time)
      setBookClient(null)
      setBookForm({ date: '', startTime: '', endTime: '' })
      loadData()
    }
  }

  if (loading) return <Loading />

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay()
  const padDays = Array(startPad).fill(null)

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Schedule</h1>
          <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
            Click a client to choose date and time; confirmed sessions appear on your calendar.
          </p>
          <p className="mt-0.5 text-xs text-[var(--cp-text-muted)]">
            Times in {displayTz}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/calendar/feed"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--cp-accent-primary)] hover:underline"
          >
            Export calendar
          </a>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Availability'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create availability slot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">
                  Start time
                </label>
                <Input
                  type="datetime-local"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">
                  End time
                </label>
                <Input
                  type="datetime-local"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newSlot.is_group_session}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, is_group_session: e.target.checked })
                  }
                  className="mr-2"
                />
                <label className="text-sm font-medium text-[var(--cp-text-primary)]">
                  Group session
                </label>
              </div>
              {newSlot.is_group_session && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Participants
                  </label>
                  <Input
                    type="number"
                    value={newSlot.max_participants}
                    onChange={(e) =>
                      setNewSlot({ ...newSlot, max_participants: parseInt(e.target.value) || 1 })
                    }
                    min={1}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Repeat</label>
                <select
                  value={newSlot.repeat}
                  onChange={(e) => setNewSlot({ ...newSlot, repeat: e.target.value as 'none' | 'daily' | 'weekly' })}
                  className="mt-1 w-full max-w-xs h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
                >
                  <option value="none">No repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              {(newSlot.repeat === 'daily' || newSlot.repeat === 'weekly') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--cp-text-primary)]">End date (optional)</label>
                    <Input
                      type="date"
                      value={newSlot.repeatEndDate}
                      onChange={(e) => setNewSlot({ ...newSlot, repeatEndDate: e.target.value })}
                      className="mt-1 max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Or number of occurrences (if no end date)</label>
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      value={newSlot.repeatCount}
                      onChange={(e) => setNewSlot({ ...newSlot, repeatCount: parseInt(e.target.value, 10) || 4 })}
                      className="mt-1 max-w-[8rem] bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
                    />
                  </div>
                </>
              )}
              <div className="border-t border-[var(--cp-border-subtle)] pt-4 mt-2 space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--cp-text-primary)]">
                  <input
                    type="checkbox"
                    checked={newSlot.is_paid_slot}
                    onChange={(e) =>
                      setNewSlot((prev) => ({
                        ...prev,
                        is_paid_slot: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[var(--cp-border-subtle)]"
                  />
                  Make this a paid bookable slot
                </label>
                <p className="text-xs text-[var(--cp-text-muted)]">
                  Use one of your session packages so clients can book and pay for this time directly.
                </p>
                {newSlot.is_paid_slot && (
                  <>
                    {sessionProducts.length === 0 ? (
                      <p className="text-xs text-[var(--cp-text-muted)]">
                        You don&apos;t have any session types yet. Create one under Session Packages, then come
                        back to make specific times bookable.
                      </p>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                            Session type
                          </label>
                          <select
                            value={newSlot.session_product_id}
                            onChange={(e) =>
                              setNewSlot((prev) => ({
                                ...prev,
                                session_product_id: e.target.value,
                              }))
                            }
                            required
                            className="mt-1 w-full max-w-xs h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
                          >
                            <option value="">Select a session type…</option>
                            {sessionProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} – ${((p.price_cents ?? 0) / 100).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                            Optional label shown to clients
                          </label>
                          <Input
                            type="text"
                            value={newSlot.label}
                            onChange={(e) =>
                              setNewSlot((prev) => ({
                                ...prev,
                                label: e.target.value,
                              }))
                            }
                            placeholder="e.g. Friday open mat, 60-min 1:1"
                            className="mt-1 max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
              <Button type="submit">Create slot{newSlot.repeat !== 'none' ? 's' : ''}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {sessionRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending session requests</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)]">
              Client has paid and submitted availability. Pick a time slot to confirm.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionRequests.map((req) => {
              const client = req.clients as any
              const product = req.session_products as any
              return (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--cp-border-subtle)] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{client?.full_name ?? 'Client'} – {product?.name ?? 'Session'}</p>
                    {req.availability_preferences?.notes && (
                      <p className="text-xs text-[var(--cp-text-muted)] mt-0.5">
                        {req.availability_preferences.notes}
                      </p>
                    )}
                  </div>
                  <Button size="sm" onClick={() => { setSchedulingRequest(req); setSchedulingSlotId(null) }}>
                    Schedule
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {schedulingRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cp-bg-backdrop)] p-4"
          onClick={() => !schedulingSubmitting && setSchedulingRequest(null)}
        >
          <div
            className="bg-[var(--cp-bg-elevated)] text-[var(--cp-text-primary)] border border-[var(--cp-border-subtle)] rounded-lg shadow-[var(--cp-shadow-card)] max-w-md w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Pick a time slot</h3>
            <p className="text-sm text-[var(--cp-text-muted)] mt-1">
              Choose an available slot to confirm this session.
            </p>
            <div className="mt-4 space-y-2">
              {slots
                .filter((slot) => new Date(slot.start_time) > new Date() && !sessions.some((s) => s.availability_slot_id === slot.id))
                .slice(0, 20)
                .map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSchedulingSlotId(slot.id)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${
                      schedulingSlotId === slot.id
                        ? 'border-[var(--cp-accent-primary)] bg-[var(--cp-accent-primary-soft)]'
                        : 'border-[var(--cp-border-subtle)] hover:bg-[rgba(148,163,184,0.16)]'
                    }`}
                  >
                    {formatInTz(slot.start_time, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} – {formatInTz(slot.end_time, { hour: 'numeric', minute: '2-digit' })}
                  </button>
                ))}
            </div>
            {slots.filter((slot) => new Date(slot.start_time) > new Date() && !sessions.some((s) => s.availability_slot_id === slot.id)).length === 0 && (
              <p className="text-sm text-[var(--cp-text-muted)] mt-2">
                No available slots. Add availability above first.
              </p>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSchedulingRequest(null)} disabled={schedulingSubmitting}>Cancel</Button>
              <Button onClick={handleScheduleRequestToSlot} disabled={!schedulingSlotId || schedulingSubmitting}>
                {schedulingSubmitting ? 'Scheduling...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Available fighters</CardTitle>
            <p className="text-xs text-[var(--cp-text-muted)] font-normal mt-1">
              Click a client to book a session
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--cp-border-subtle)] max-h-[400px] overflow-y-auto">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setBookClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-[rgba(148,163,184,0.12)] border-b border-[var(--cp-border-subtle)] last:border-0"
                >
                  <p className="font-medium text-[var(--cp-text-primary)]">
                    {client.full_name?.trim() || 'Unnamed'}
                  </p>
                  {client.email && (
                    <p className="text-xs text-[var(--cp-text-muted)] truncate mt-0.5">{client.email}</p>
                  )}
                </button>
              ))}
              {clients.length === 0 && (
                <EmptyState
                  title="No clients yet"
                  description="Add a client to book sessions."
                  action={{ label: "Add client", href: "/coach/clients/new" }}
                  className="py-6"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {bookClient && (
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Book session</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setBookClient(null); setBookForm({ date: '', startTime: '', endTime: '' }) }}>Close</Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-[var(--cp-text-primary)] mb-3">
                {bookClient.full_name}
              </p>
              <form onSubmit={handleBookSessionSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={bookForm.date}
                    onChange={(e) => setBookForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                    Start time
                  </label>
                  <select
                    value={bookForm.startTime}
                    onChange={(e) => setBookForm((f) => ({ ...f, startTime: e.target.value }))}
                    required
                    className="w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                  >
                    <option value="">Select start</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTimeOption(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                    End time
                  </label>
                  <select
                    value={bookForm.endTime}
                    onChange={(e) => setBookForm((f) => ({ ...f, endTime: e.target.value }))}
                    required
                    className="w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                  >
                    <option value="">Select end</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTimeOption(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? 'Adding…' : 'Submit'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setBookClient(null)
                    setBookForm({ date: '', startTime: '', endTime: '' })
                  }}
                >
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className={bookClient ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                >
                  Previous
                </Button>
                <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">
                  {format(month, 'MMMM yyyy')}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                >
                  Next
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-px bg-[var(--cp-bg-subtle)] rounded overflow-hidden">
                {weekDays.map((d) => (
                  <div
                    key={d}
                    className="bg-[var(--cp-bg-surface)] p-2 text-center text-xs font-medium text-[var(--cp-text-muted)]"
                  >
                    {d}
                  </div>
                ))}
                {padDays.map((_, i) => (
                  <div key={`pad-${i}`} className="bg-[var(--cp-bg-surface)] min-h-[80px]" />
                ))}
                {days.map((day) => {
                  const daySessions = getSessionsForDay(sessions, day)
                  return (
                    <div
                      key={day.toISOString()}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDay(day)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedDay(day)}
                      className={`bg-[var(--cp-bg-surface)] min-h-[100px] p-1 cursor-pointer hover:bg-[rgba(148,163,184,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] ${
                        !isSameMonth(day, month) ? 'opacity-50' : ''
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          isToday(day)
                            ? 'text-[var(--cp-accent-primary)]'
                            : 'text-[var(--cp-text-primary)]'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1 mt-1">
                        {daySessions.length > 0 ? (
                          daySessions.map((session) => {
                            const start = parseISO(session.scheduled_time)
                            const end = session.availability_slots?.end_time
                              ? parseISO(session.availability_slots.end_time)
                              : addMinutes(start, 60)
                            const colorClass = getFighterColor(session.client_id, clients)
                            return (
                              <button
                                key={session.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditSession(session)
                                }}
                                className={`w-full rounded border px-2 py-1.5 text-left text-xs hover:opacity-90 ${colorClass}`}
                                title="Click to edit, move, or delete"
                              >
                                <div className="font-semibold truncate">
                                  {session.clients?.full_name ?? 'Client'}
                                </div>
                                <div className="text-[11px] opacity-90">
                                  {formatInTz(session.scheduled_time, { hour: 'numeric', minute: '2-digit' })} – {formatInTz(end.toISOString(), { hour: 'numeric', minute: '2-digit' })}
                                </div>
                              </button>
                            )
                          })
                        ) : (
                          <p className="text-xs text-[var(--cp-text-muted)]">—</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sessions (this month)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sessions
                  .filter((s) => isSameMonth(parseISO(s.scheduled_time), month))
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-wrap justify-between items-center gap-2 border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{session.clients?.full_name}</p>
                        <p className="text-sm text-gray-500">
                          {format(
                            parseISO(session.scheduled_time),
                            'MMM d, yyyy h:mm a'
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {session.paid_at
                            ? `Paid ${format(new Date(session.paid_at), 'MMM d, yyyy')}`
                            : 'Unpaid'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            session.status === 'confirmed'
                              ? 'bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]'
                              : session.status === 'pending'
                                ? 'bg-[var(--cp-accent-warning)]/20 text-[var(--cp-accent-warning)]'
                                : 'bg-[var(--cp-accent-primary-soft)] text-[var(--cp-text-primary)]'
                          }`}
                        >
                          {session.status}
                        </span>
                        {session.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveSession(session.id)}
                          >
                            Approve
                          </Button>
                        )}
                        {!session.paid_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsPaid(session.id)}
                          >
                            Mark as paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditSession(session)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                {sessions.filter((s) =>
                  isSameMonth(parseISO(s.scheduled_time), month)
                ).length === 0 && (
                  <p className="text-[var(--cp-text-muted)] text-sm">
                    No sessions this month
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-[var(--cp-bg-backdrop)] p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <Card className="flex flex-col max-h-[90vh]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 shrink-0">
                <CardTitle className="text-lg">
                  {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                >
                  Back to calendar
                </Button>
              </CardHeader>
              <CardContent className="overflow-y-auto shrink min-h-0">
                {(() => {
                  const daySessionsList = getSessionsForDay(sessions, selectedDay).sort(
                    (a, b) =>
                      new Date(a.scheduled_time).getTime() -
                      new Date(b.scheduled_time).getTime()
                  )
                  const TIMELINE_START = 6
                  const TIMELINE_END = 22
                  const TOTAL_MINUTES = (TIMELINE_END - TIMELINE_START) * 60
                  const HOUR_HEIGHT = 40
                  const timelineHeight = (TIMELINE_END - TIMELINE_START) * HOUR_HEIGHT

                  return (
                    <div className="flex gap-4">
                      <div
                        className="shrink-0 flex flex-col text-sm text-[var(--cp-text-muted)]"
                        style={{ width: '4rem' }}
                      >
                        {Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => (
                          <div
                            key={i}
                            className="pr-2"
                            style={{ height: HOUR_HEIGHT, lineHeight: `${HOUR_HEIGHT}px` }}
                          >
                            {format(
                              new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), TIMELINE_START + i),
                              'h a'
                            )}
                          </div>
                        ))}
                      </div>
                      <div
                        className="flex-1 relative border-l border-[var(--cp-border-subtle)]"
                        style={{ height: timelineHeight, minHeight: timelineHeight }}
                      >
                        {daySessionsList.length === 0 ? (
                          <p className="text-sm text-[var(--cp-text-muted)] pt-4">
                            No sessions this day
                          </p>
                        ) : (
                          daySessionsList.map((session) => {
                            const start = parseISO(session.scheduled_time)
                            const end = session.availability_slots?.end_time
                              ? parseISO(session.availability_slots.end_time)
                              : addMinutes(start, 60)
                            const startMinutes =
                              start.getHours() * 60 +
                              start.getMinutes() -
                              TIMELINE_START * 60
                            const endMinutes =
                              end.getHours() * 60 + end.getMinutes() - TIMELINE_START * 60
                            const durationMinutes = Math.max(0, endMinutes - startMinutes)
                            const topPct = Math.max(0, (startMinutes / TOTAL_MINUTES) * 100)
                            const heightPct = Math.min(
                              100 - topPct,
                              (durationMinutes / TOTAL_MINUTES) * 100
                            )
                            const colorClass = getFighterColor(session.client_id, clients)
                            return (
                              <button
                                key={session.id}
                                type="button"
                                onClick={() => openEditSession(session)}
                                className={`absolute left-1 right-1 rounded border px-2 py-1.5 text-left text-xs hover:opacity-90 ${colorClass}`}
                                style={{
                                  top: `${topPct}%`,
                                  height: `${heightPct}%`,
                                  minHeight: '2rem',
                                }}
                                title="Click to edit or add notes"
                              >
                                <div className="font-semibold truncate">
                                  {session.clients?.full_name ?? 'Client'}
                                </div>
                                <div className="text-[11px] opacity-90">
                                  {formatInTz(session.scheduled_time, { hour: 'numeric', minute: '2-digit' })} – {formatInTz(end.toISOString(), { hour: 'numeric', minute: '2-digit' })}
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {editingSession && (
        <div className="fixed inset-0 z-50 bg-[var(--cp-bg-backdrop)] p-4 flex items-center justify-center">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Edit session</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingSession(null)}
                  disabled={savingEdit}
                >
                  Close
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-[var(--cp-text-primary)]">
                  {editingSession.clients?.full_name ?? 'Client'}
                </p>
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                        Notes or plan for this session
                      </label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                        placeholder="Warm-up, drills, focus areas..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                        Start
                      </label>
                      <select
                        value={editForm.startTime}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, startTime: e.target.value }))
                        }
                        required
                        className="w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTimeOption(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--cp-text-muted)]">
                        End
                      </label>
                      <select
                        value={editForm.endTime}
                        onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                        required
                        className="w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTimeOption(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(editingSession.status === 'confirmed' || editingSession.status === 'pending') && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                        onClick={handleMarkCompleted}
                        disabled={savingEdit}
                      >
                        Mark as completed
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={handleMarkCanceled}
                        disabled={savingEdit}
                      >
                        Mark as canceled
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2 pt-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Saving…' : 'Save changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      onClick={handleDeleteSession}
                      disabled={savingEdit}
                    >
                      Delete session
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
