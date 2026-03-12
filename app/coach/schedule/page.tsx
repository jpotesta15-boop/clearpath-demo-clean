'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ListRow } from '@/components/ui/ListRow'
import { Modal } from '@/components/ui/modal'
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
  const [month, setMonth] = useState(() => new Date())
  const [bookClient, setBookClient] = useState<Client | null>(null)
  const [bookForm, setBookForm] = useState({ date: '', startTime: '', endTime: '' })
  const [bookSessionProductId, setBookSessionProductId] = useState<string>('')
  const [bookRequirePayment, setBookRequirePayment] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editForm, setEditForm] = useState({ date: '', startTime: '', endTime: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [sessionRequests, setSessionRequests] = useState<any[]>([])
  const [schedulingRequest, setSchedulingRequest] = useState<any>(null)
  const [schedulingSlotId, setSchedulingSlotId] = useState<string | null>(null)
  const [schedulingForm, setSchedulingForm] = useState({ date: '', startTime: '', endTime: '', notes: '' })
  const [schedulingSubmitting, setSchedulingSubmitting] = useState(false)
  const [schedulingError, setSchedulingError] = useState<string | null>(null)
  const [coachTimezone, setCoachTimezone] = useState<string | null>(null)
  const [clientTimeRequests, setClientTimeRequests] = useState<any[]>([])
  const [offerFromTimeRequest, setOfferFromTimeRequest] = useState<any>(null)
  const [offerProductId, setOfferProductId] = useState('')
  const [offerSubmitting, setOfferSubmitting] = useState(false)
  const [reminderSendingId, setReminderSendingId] = useState<string | null>(null)
  const [reminderError, setReminderError] = useState<string | null>(null)
  const supabase = createClient()
  const tenantId = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'demo'

  // Time options for availability: 6:00 AM–8:00 PM, 30-min steps (HH:mm)
  const TIME_OPTIONS = (() => {
    const opts: string[] = []
    for (let h = 6; h <= 20; h++) {
      opts.push(`${h.toString().padStart(2, '0')}:00`)
      if (h < 20) opts.push(`${h.toString().padStart(2, '0')}:30`)
    }
    return opts
  })()

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

    const { data: timeRequestsData } = await supabase
      .from('client_time_requests')
      .select('*, clients(full_name, email)')
      .eq('coach_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    setSlots(slotsData || [])
    setSessions(sessionsData || [])
    setClients(clientsData || [])
    setSessionProducts(productsData || [])
    setSessionRequests(requestsData || [])
    setClientTimeRequests(timeRequestsData || [])
    setLoading(false)
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

  const openSchedulingModal = (req: any) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setSchedulingRequest(req)
    setSchedulingForm({
      date: format(tomorrow, 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      notes: '',
    })
    setSchedulingError(null)
  }

  const handleConfirmScheduleWithDateTime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedulingRequest || schedulingSubmitting) return
    const { date, startTime, endTime, notes } = schedulingForm
    if (!date || !startTime || !endTime) {
      setSchedulingError('Please pick date and time.')
      return
    }
    const startDateTime = new Date(`${date}T${startTime}`)
    const endDateTime = new Date(`${date}T${endTime}`)
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || endDateTime <= startDateTime) {
      setSchedulingError('Invalid time range.')
      return
    }
    if (!isSameDay(startDateTime, endDateTime)) {
      setSchedulingError('Start and end must be on the same day.')
      return
    }
    setSchedulingError(null)
    setSchedulingSubmitting(true)
    const scheduled_time = startDateTime.toISOString()
    const { data: newSession, error: sessionError } = await supabase.from('sessions').insert({
      coach_id: schedulingRequest.coach_id,
      client_id: schedulingRequest.client_id,
      availability_slot_id: null,
      scheduled_time,
      status: 'confirmed',
      tenant_id: schedulingRequest.tenant_id,
      session_request_id: schedulingRequest.id,
      session_product_id: schedulingRequest.session_product_id ?? null,
      amount_cents: schedulingRequest.amount_cents ?? null,
      notes: notes.trim() || null,
    }).select('id').single()
    if (sessionError) {
      setSchedulingError(sessionError.message ?? 'Could not create session.')
      setSchedulingSubmitting(false)
      return
    }
    if (newSession?.id) {
      await supabase
        .from('session_requests')
        .update({ status: 'scheduled', updated_at: new Date().toISOString() })
        .eq('id', schedulingRequest.id)
      notifySessionBooked(newSession.id, schedulingRequest.coach_id, schedulingRequest.client_id, scheduled_time)
      setSchedulingRequest(null)
      setSchedulingForm({ date: '', startTime: '', endTime: '', notes: '' })
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

  const handleSendReminder = async (sessionId: string) => {
    setReminderError(null)
    setReminderSendingId(sessionId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/send-reminder`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setReminderError(data?.error ?? 'Could not send reminder')
        return
      }
      setReminderError(null)
    } catch {
      setReminderError('Could not send reminder')
    } finally {
      setReminderSendingId(null)
    }
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

  const handleOfferFromTimeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerFromTimeRequest || !offerProductId || offerSubmitting) return
    const product = sessionProducts.find((p) => p.id === offerProductId)
    if (!product) return
    const client = offerFromTimeRequest.clients as any
    if (!client) return

    setOfferSubmitting(true)
    const { data: sessionRequest, error: reqError } = await supabase
      .from('session_requests')
      .insert({
        coach_id: (await supabase.auth.getUser()).data.user!.id,
        client_id: offerFromTimeRequest.client_id,
        session_product_id: product.id,
        tenant_id: tenantId,
        status: 'offered',
        amount_cents: product.price_cents ?? 0,
      })
      .select('id')
      .single()

    if (!reqError && sessionRequest?.id) {
      await supabase
        .from('client_time_requests')
        .update({ status: 'offered', session_request_id: sessionRequest.id, updated_at: new Date().toISOString() })
        .eq('id', offerFromTimeRequest.id)

      const { data: clientProfile } = await supabase.from('profiles').select('id').eq('email', client.email).single()
      if (clientProfile?.id) {
        const amount = ((product.price_cents ?? 0) / 100).toFixed(2)
        await supabase.from('messages').insert({
          sender_id: (await supabase.auth.getUser()).data.user!.id,
          recipient_id: clientProfile.id,
          client_id: tenantId,
          content: JSON.stringify({
            type: 'session_offer',
            session_request_id: sessionRequest.id,
            product_name: product.name,
            amount_cents: product.price_cents ?? 0,
            amount_display: amount,
          }),
        })
      }
      setOfferFromTimeRequest(null)
      setOfferProductId('')
      loadData()
    }
    setOfferSubmitting(false)
  }

  const handleDeclineTimeRequest = async (requestId: string) => {
    await supabase
      .from('client_time_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId)
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

    setSubmitting(true)

    const product = bookSessionProductId
      ? sessionProducts.find((p) => p.id === bookSessionProductId)
      : null

    if (bookRequirePayment) {
      if (!product) {
        setSubmitting(false)
        return
      }

      const { error: requestError } = await supabase
        .from('session_requests')
        .insert({
          coach_id: user.id,
          client_id: bookClient.id,
          session_product_id: product.id,
          tenant_id: tenantId,
          status: 'offered',
          amount_cents: product.price_cents ?? 0,
        })

      setSubmitting(false)
      if (!requestError) {
        setBookClient(null)
        setBookForm({ date: '', startTime: '', endTime: '' })
        setBookSessionProductId('')
        setBookRequirePayment(false)
        loadData()
      }
      return
    }

    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        coach_id: user.id,
        client_id: bookClient.id,
        availability_slot_id: null,
        scheduled_time: start_time,
        status: 'confirmed',
        tenant_id: tenantId,
        session_product_id: product?.id ?? null,
        amount_cents: product?.price_cents ?? null,
      })
      .select('id')
      .single()

    setSubmitting(false)
    if (!sessionError && newSession?.id) {
      notifySessionBooked(newSession.id, user.id, bookClient.id, start_time)
      setBookClient(null)
      setBookForm({ date: '', startTime: '', endTime: '' })
      setBookSessionProductId('')
      setBookRequirePayment(false)
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
    <div className="space-y-8">
      <PageHeader
        title="Schedule"
        subtitle={`Book by client. Times in ${displayTz}.`}
        primaryAction={
          <Button variant="ghost" size="sm" asChild>
            <a href="/api/calendar/feed" target="_blank" rel="noopener noreferrer">
              Export calendar
            </a>
          </Button>
        }
      />

      {(clientTimeRequests.length > 0 || sessionRequests.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clientTimeRequests.length > 0 && (
            <Card variant="raised" className="border-[var(--cp-accent-primary)]/30">
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Client time requests"
                  subtitle="Clients shared availability. Offer a session to send a payment link."
                  className="mb-4"
                />
                <ul className="divide-y divide-[var(--cp-border-subtle)]">
                  {clientTimeRequests.map((req) => {
                    const client = req.clients as any
                    return (
                      <li key={req.id}>
                        <ListRow
                          title={client?.full_name ?? 'Client'}
                          subtitle={req.preferred_times}
                          actions={
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => { setOfferFromTimeRequest(req); setOfferProductId(sessionProducts[0]?.id ?? '') }}>
                                Offer session
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeclineTimeRequest(req.id)}>
                                Decline
                              </Button>
                            </div>
                          }
                          className="px-0"
                        />
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
          {sessionRequests.length > 0 && (
            <Card variant="raised">
              <CardContent className="p-5 sm:p-6">
                <SectionHeader
                  title="Ready to schedule"
                  subtitle="Client paid and submitted availability. Pick a time to confirm."
                  className="mb-4"
                />
                <ul className="divide-y divide-[var(--cp-border-subtle)]">
                  {sessionRequests.map((req) => {
                    const client = req.clients as any
                    const product = req.session_products as any
                    return (
                      <li key={req.id}>
                        <ListRow
                          title={`${client?.full_name ?? 'Client'} – ${product?.name ?? 'Session'}`}
                          subtitle={req.availability_preferences?.notes ?? undefined}
                          actions={
                            <Button size="sm" onClick={() => openSchedulingModal(req)}>
                              Offer time & confirm
                            </Button>
                          }
                          className="px-0"
                        />
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={!!offerFromTimeRequest}
        onClose={() => !offerSubmitting && setOfferFromTimeRequest(null)}
        preventClose={!!offerSubmitting}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[var(--cp-text-primary)]">Offer session</h3>
          <p className="text-sm text-[var(--cp-text-muted)] mt-1">
            Pick a session type to send a payment offer.
          </p>
          <form onSubmit={handleOfferFromTimeRequest} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Session type</label>
              <select
                value={offerProductId}
                onChange={(e) => setOfferProductId(e.target.value)}
                required
                className="mt-1 w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
              >
                <option value="">Select…</option>
                {sessionProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} – ${((p.price_cents ?? 0) / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOfferFromTimeRequest(null)} disabled={offerSubmitting}>Cancel</Button>
              <Button type="submit" disabled={!offerProductId || offerSubmitting}>
                {offerSubmitting ? 'Sending...' : 'Send offer'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        open={!!schedulingRequest}
        onClose={() => !schedulingSubmitting && (setSchedulingRequest(null), setSchedulingError(null))}
        preventClose={!!schedulingSubmitting}
        className="max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[var(--cp-text-primary)]">Offer session & confirm time</h3>
            {(() => {
              const client = schedulingRequest?.clients as any
              const product = schedulingRequest?.session_products as any
              return (
                <p className="text-sm text-[var(--cp-text-muted)] mt-1">
                  {client?.full_name ?? 'Client'} – {product?.name ?? 'Session'}
                  {schedulingRequest?.amount_cents != null && (
                    <span> · ${((schedulingRequest.amount_cents / 100)).toFixed(2)}</span>
                  )}
                </p>
              )
            })()}
            <form onSubmit={handleConfirmScheduleWithDateTime} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--cp-text-muted)]">Date</label>
                <Input
                  type="date"
                  value={schedulingForm.date}
                  onChange={(e) => setSchedulingForm((f) => ({ ...f, date: e.target.value }))}
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--cp-text-muted)]">Start time</label>
                  <select
                    value={schedulingForm.startTime}
                    onChange={(e) => setSchedulingForm((f) => ({ ...f, startTime: e.target.value }))}
                    required
                    className="mt-1 w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{formatTimeOption(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--cp-text-muted)]">End time</label>
                  <select
                    value={schedulingForm.endTime}
                    onChange={(e) => setSchedulingForm((f) => ({ ...f, endTime: e.target.value }))}
                    required
                    className="mt-1 w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{formatTimeOption(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--cp-text-muted)]">Notes or plan (optional)</label>
                <textarea
                  value={schedulingForm.notes}
                  onChange={(e) => setSchedulingForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                  placeholder="Warm-up, drills, focus areas..."
                />
              </div>
              {schedulingError && (
                <p className="text-sm text-[var(--cp-accent-danger)]">{schedulingError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setSchedulingRequest(null); setSchedulingError(null) }}
                  disabled={schedulingSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={schedulingSubmitting}>
                  {schedulingSubmitting ? 'Confirming…' : 'Confirm session'}
                </Button>
              </div>
            </form>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card variant="raised" className="lg:col-span-1">
          <div className="p-5 sm:p-6 pb-0">
            <SectionHeader
              title="Available fighters"
              subtitle="Click a client to book a session"
            />
          </div>
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
                  action={{ label: 'Add client', href: '/coach/clients/new' }}
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
                    Session type (optional)
                  </label>
                  <select
                    value={bookSessionProductId}
                    onChange={(e) => setBookSessionProductId(e.target.value)}
                    className="w-full h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                  >
                    <option value="">No specific package</option>
                    {sessionProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} – ${((p.price_cents ?? 0) / 100).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="book-require-payment"
                    type="checkbox"
                    checked={bookRequirePayment}
                    onChange={(e) => setBookRequirePayment(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--cp-border-subtle)]"
                  />
                  <label
                    htmlFor="book-require-payment"
                    className="text-xs font-medium text-[var(--cp-text-muted)]"
                  >
                    Require card payment before confirming
                  </label>
                </div>
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

          <Card variant="raised" className="mt-8">
            <CardContent className="p-5 sm:p-6">
              <SectionHeader title="Sessions (this month)" className="mb-4" />
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sessions
                  .filter((s) => isSameMonth(parseISO(s.scheduled_time), month))
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-wrap justify-between items-center gap-2 border-b border-[var(--cp-border-subtle)] pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-[var(--cp-text-primary)]">{session.clients?.full_name}</p>
                        <p className="text-sm text-[var(--cp-text-muted)]">
                          {format(
                            parseISO(session.scheduled_time),
                            'MMM d, yyyy h:mm a'
                          )}
                        </p>
                        <p className="text-xs text-[var(--cp-text-muted)]">
                          {session.paid_at
                            ? `Paid ${format(new Date(session.paid_at), 'MMM d, yyyy')}`
                            : 'Unpaid'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge
                          status={session.status === 'confirmed' ? 'success' : session.status === 'pending' ? 'warning' : 'neutral'}
                          label={session.status}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditSession(session)}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                {reminderError && (
                  <p className="text-sm text-[var(--cp-accent-danger)] py-1">{reminderError}</p>
                )}
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

      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <Card className="flex flex-col max-h-[90vh] border-0 shadow-none bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 shrink-0">
                <CardTitle className="text-lg">
                  {selectedDay ? format(selectedDay, 'EEEE, MMMM d, yyyy') : ''}
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
                  if (!selectedDay) return null
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
      </Modal>

      <Modal
        open={!!editingSession}
        onClose={() => !savingEdit && setEditingSession(null)}
        preventClose={!!savingEdit}
      >
        <Card className="border-0 shadow-none">
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
                <div className="flex flex-wrap gap-2">
                  {editingSession.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await handleApproveSession(editingSession.id)
                        setEditingSession(null)
                      }}
                      disabled={savingEdit}
                    >
                      Approve
                    </Button>
                  )}
                  {!editingSession.paid_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await handleMarkAsPaid(editingSession.id)
                        setEditingSession(null)
                      }}
                      disabled={savingEdit}
                    >
                      Mark as paid
                    </Button>
                  )}
                </div>
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
                        className="flex-1 border-[var(--cp-accent-success)] text-[var(--cp-accent-success)] hover:bg-[var(--cp-accent-success)]/10"
                        onClick={handleMarkCompleted}
                        disabled={savingEdit}
                      >
                        Mark as completed
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-[var(--cp-accent-warning)] text-[var(--cp-accent-warning)] hover:bg-[var(--cp-accent-warning)]/10"
                        onClick={handleMarkCanceled}
                        disabled={savingEdit}
                      >
                        Mark as canceled
                      </Button>
                    </div>
                  )}
                  {editingSession.status === 'confirmed' &&
                    new Date(editingSession.scheduled_time) > new Date() && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleSendReminder(editingSession.id)}
                        disabled={savingEdit || reminderSendingId === editingSession.id}
                      >
                        {reminderSendingId === editingSession.id ? 'Sending…' : 'Remind client'}
                      </Button>
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
                      className="w-full border-[var(--cp-accent-danger)] text-[var(--cp-accent-danger)] hover:bg-[var(--cp-accent-danger)]/10"
                      onClick={handleDeleteSession}
                      disabled={savingEdit}
                    >
                      Delete session
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
      </Modal>
    </div>
  )
}
