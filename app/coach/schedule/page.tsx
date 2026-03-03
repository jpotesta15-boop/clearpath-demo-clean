'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  'bg-blue-100 text-blue-900 border-blue-300',
  'bg-emerald-100 text-emerald-900 border-emerald-300',
  'bg-amber-100 text-amber-900 border-amber-300',
  'bg-violet-100 text-violet-900 border-violet-300',
  'bg-rose-100 text-rose-900 border-rose-300',
  'bg-cyan-100 text-cyan-900 border-cyan-300',
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [month, setMonth] = useState(() => new Date())
  const [newSlot, setNewSlot] = useState({
    start_time: '',
    end_time: '',
    is_group_session: false,
    max_participants: 1,
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
  const supabase = createClient()
  const tenantId = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'demo'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

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
      .select('id, full_name')
      .eq('coach_id', user.id)
      .order('full_name', { ascending: true })

    const { data: requestsData } = await supabase
      .from('session_requests')
      .select('*, clients(*), session_products(name)')
      .eq('coach_id', user.id)
      .eq('status', 'availability_submitted')
      .order('created_at', { ascending: false })

    setSlots(slotsData || [])
    setSessions(sessionsData || [])
    setClients(clientsData || [])
    setSessionRequests(requestsData || [])
    setLoading(false)
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('availability_slots').insert({
      coach_id: user.id,
      client_id: tenantId,
      ...newSlot,
    })

    if (!error) {
      setShowForm(false)
      setNewSlot({
        start_time: '',
        end_time: '',
        is_group_session: false,
        max_participants: 1,
      })
      loadData()
    }
  }

  const handleApproveSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'confirmed' })
      .eq('id', sessionId)
    if (!error) loadData()
  }

  const handleScheduleRequestToSlot = async () => {
    if (!schedulingRequest || !schedulingSlotId) return
    const slot = slots.find((s) => s.id === schedulingSlotId)
    if (!slot) return
    setSchedulingSubmitting(true)
    const { error: sessionError } = await supabase.from('sessions').insert({
      coach_id: schedulingRequest.coach_id,
      client_id: schedulingRequest.client_id,
      availability_slot_id: schedulingSlotId,
      scheduled_time: slot.start_time,
      status: 'confirmed',
      tenant_id: schedulingRequest.tenant_id,
      session_request_id: schedulingRequest.id,
      session_product_id: schedulingRequest.session_product_id ?? null,
      amount_cents: schedulingRequest.amount_cents ?? null,
    })
    if (!sessionError) {
      await supabase
        .from('session_requests')
        .update({ status: 'scheduled', updated_at: new Date().toISOString() })
        .eq('id', schedulingRequest.id)
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

    const { error: sessionError } = await supabase.from('sessions').insert({
      coach_id: user.id,
      client_id: bookClient.id,
      availability_slot_id: slot.id,
      scheduled_time: start_time,
      status: 'confirmed',
      tenant_id: tenantId,
    })
    setSubmitting(false)
    if (!sessionError) {
      setBookClient(null)
      setBookForm({ date: '', startTime: '', endTime: '' })
      loadData()
    }
  }

  if (loading) return <div className="p-4">Loading...</div>

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
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Click a client to choose date and time; the session is added to your calendar.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Availability'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Availability Slot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <Input
                  type="datetime-local"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
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
                <label className="text-sm font-medium text-gray-700">Group Session</label>
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
              <Button type="submit">Create Slot</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {sessionRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending session requests</CardTitle>
            <p className="text-sm font-normal text-gray-500">Client has paid and submitted availability. Pick a time slot to confirm.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionRequests.map((req) => {
              const client = req.clients as any
              const product = req.session_products as any
              return (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{client?.full_name ?? 'Client'} – {product?.name ?? 'Session'}</p>
                    {req.availability_preferences?.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{req.availability_preferences.notes}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !schedulingSubmitting && setSchedulingRequest(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Pick a time slot</h3>
            <p className="text-sm text-gray-500 mt-1">Choose an available slot to confirm this session.</p>
            <div className="mt-4 space-y-2">
              {slots
                .filter((slot) => new Date(slot.start_time) > new Date() && !sessions.some((s) => s.availability_slot_id === slot.id))
                .slice(0, 20)
                .map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSchedulingSlotId(slot.id)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm ${schedulingSlotId === slot.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    {format(parseISO(slot.start_time), 'EEE, MMM d, yyyy h:mm a')} – {format(parseISO(slot.end_time), 'h:mm a')}
                  </button>
                ))}
            </div>
            {slots.filter((slot) => new Date(slot.start_time) > new Date() && !sessions.some((s) => s.availability_slot_id === slot.id)).length === 0 && (
              <p className="text-sm text-gray-500 mt-2">No available slots. Add availability above first.</p>
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
            <p className="text-xs text-gray-500 font-normal mt-1">Click a client to book a session</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setBookClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  <p className="font-medium text-gray-900">{client.full_name}</p>
                </button>
              ))}
              {clients.length === 0 && (
                <p className="px-4 py-6 text-gray-500 text-sm">No clients</p>
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
              <p className="text-sm font-medium text-gray-700 mb-3">{bookClient.full_name}</p>
              <form onSubmit={handleBookSessionSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Date</label>
                  <Input
                    type="date"
                    value={bookForm.date}
                    onChange={(e) => setBookForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Start time</label>
                  <select
                    value={bookForm.startTime}
                    onChange={(e) => setBookForm((f) => ({ ...f, startTime: e.target.value }))}
                    required
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                  <label className="block text-xs font-medium text-gray-600">End time</label>
                  <select
                    value={bookForm.endTime}
                    onChange={(e) => setBookForm((f) => ({ ...f, endTime: e.target.value }))}
                    required
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                <h2 className="text-lg font-semibold text-gray-900">
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

              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
                {weekDays.map((d) => (
                  <div
                    key={d}
                    className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-600"
                  >
                    {d}
                  </div>
                ))}
                {padDays.map((_, i) => (
                  <div key={`pad-${i}`} className="bg-gray-50 min-h-[80px]" />
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
                      className={`bg-white min-h-[100px] p-1 cursor-pointer hover:bg-gray-50 ${
                        !isSameMonth(day, month) ? 'opacity-50' : ''
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          isToday(day) ? 'text-blue-600' : 'text-gray-700'
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
                                  {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
                                </div>
                              </button>
                            )
                          })
                        ) : (
                          <p className="text-xs text-gray-400">—</p>
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
                              ? 'bg-green-100 text-green-800'
                              : session.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
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
                  <p className="text-gray-500 text-sm">No sessions this month</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
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
                        className="shrink-0 flex flex-col text-sm text-gray-500"
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
                        className="flex-1 relative border-l border-gray-200"
                        style={{ height: timelineHeight, minHeight: timelineHeight }}
                      >
                        {daySessionsList.length === 0 ? (
                          <p className="text-sm text-gray-500 pt-4">No sessions this day</p>
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
                                  {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
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
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
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
                <p className="text-sm font-medium text-gray-800">
                  {editingSession.clients?.full_name ?? 'Client'}
                </p>
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Date</label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">
                        Notes or plan for this session
                      </label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, notes: e.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Warm-up, drills, focus areas..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Start</label>
                      <select
                        value={editForm.startTime}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, startTime: e.target.value }))
                        }
                        required
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {formatTimeOption(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600">End</label>
                      <select
                        value={editForm.endTime}
                        onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                        required
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
