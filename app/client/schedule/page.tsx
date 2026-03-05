'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'

function ClientScheduleContent() {
  const [slots, setSlots] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionRequests, setSessionRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)
  const [submittingRequestId, setSubmittingRequestId] = useState<string | null>(null)
  const [decliningRequestId, setDecliningRequestId] = useState<string | null>(null)
  const [availabilityText, setAvailabilityText] = useState('')
  const [submittingAvailability, setSubmittingAvailability] = useState(false)
  const [coachTimezone, setCoachTimezone] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  const displayTz = coachTimezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC')

  function formatInTz(isoString: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }): string {
    return new Date(isoString).toLocaleString('en-US', { ...options, timeZone: displayTz })
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const paidId = searchParams.get('paid') === '1' ? searchParams.get('session_request_id') : null
    if (paidId && sessionRequests.length > 0) {
      const req = sessionRequests.find((r) => r.id === paidId && r.status === 'paid')
      if (req) setSubmittingRequestId(paidId)
    }
  }, [searchParams, sessionRequests])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('email', user.email)
      .single()

    if (!clientData) {
      setClient(null)
      setLoading(false)
      return
    }
    setClient(clientData)

    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', clientData.coach_id)
      .single()
    if (coachProfile?.timezone) setCoachTimezone(coachProfile.timezone)

    const [slotsRes, sessionsRes, requestsRes] = await Promise.all([
      supabase
        .from('availability_slots')
        .select('*')
        .eq('coach_id', clientData.coach_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true }),
      supabase
        .from('sessions')
        .select('*')
        .eq('client_id', clientData.id)
        .order('scheduled_time', { ascending: true }),
      supabase
        .from('session_requests')
        .select('*, session_products(name, duration_minutes)')
        .eq('client_id', clientData.id)
        .in('status', ['offered', 'accepted', 'payment_pending', 'paid', 'availability_submitted', 'scheduled'])
        .order('created_at', { ascending: false }),
    ])

    setSlots(slotsRes.data || [])
    setSessions(sessionsRes.data || [])
    setSessionRequests(requestsRes.data || [])
    setLoading(false)
  }

  const handleAcceptOffer = async (requestId: string) => {
    setSubmittingRequestId(requestId)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_request_id: requestId }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        window.location.href = data.url
        return
      }
      setSubmittingRequestId(null)
    } catch {
      setSubmittingRequestId(null)
    }
  }

  const handleDeclineOffer = async (requestId: string) => {
    setDecliningRequestId(requestId)
    const { error } = await supabase
      .from('session_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId)
    if (!error) loadData()
    setDecliningRequestId(null)
  }

  const handleSubmitAvailability = async (requestId: string) => {
    if (!availabilityText.trim()) return
    setSubmittingAvailability(true)
    const { error } = await supabase
      .from('session_requests')
      .update({
        status: 'availability_submitted',
        availability_preferences: { notes: availabilityText.trim() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
    if (!error) {
      setAvailabilityText('')
      setSubmittingRequestId(null)
      loadData()
    }
    setSubmittingAvailability(false)
  }

  const handleRequestSession = async (slotId: string) => {
    if (!client) return

    const slot = slots.find(s => s.id === slotId)
    if (!slot) return

    const { error } = await supabase
      .from('sessions')
      .insert({
        coach_id: client.coach_id,
        client_id: client.id,
        availability_slot_id: slotId,
        scheduled_time: slot.start_time,
        status: 'pending',
      })

    if (!error) {
      loadData()
    }
  }

  if (loading) return <Loading />

  if (!client) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary)]">Client not found</h1>
        <p className="text-[var(--cp-text-muted)]">
          There is no client record for this account. Contact your coach to be added and to receive a portal invite.
        </p>
        <a
          href="/login"
          className="inline-flex items-center justify-center rounded-md font-medium px-4 py-2 bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)]"
        >
          Back to login
        </a>
      </div>
    )
  }

  const openAvailabilityFor = submittingRequestId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Schedule</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          View your coach&apos;s availability and request sessions.
        </p>
        <p className="mt-0.5 text-xs text-[var(--cp-text-muted)]">
          Times in {displayTz}
        </p>
      </div>

      {sessionRequests.filter((r) => ['offered', 'accepted', 'payment_pending', 'paid', 'availability_submitted'].includes(r.status)).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session offers</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)]">
              Accept and pay for offers from your coach, then submit your availability.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionRequests
              .filter((r) => ['offered', 'accepted', 'payment_pending', 'paid', 'availability_submitted'].includes(r.status))
              .map((req) => {
                const product = req.session_products as any
                const name = product?.name ?? 'Session'
                const amount = ((req.amount_cents ?? 0) / 100).toFixed(2)
                return (
                  <div
                    key={req.id}
                    className="border-b border-[var(--cp-border-subtle)] pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{name} – ${amount}</p>
                        <p className="text-xs text-[var(--cp-text-muted)]">
                          {req.status === 'offered' || req.status === 'accepted' || req.status === 'payment_pending'
                            ? 'Accept to pay with card'
                            : req.status === 'paid'
                              ? 'Paid – submit when you are available'
                              : 'Waiting for coach to confirm time'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {req.status === 'offered' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptOffer(req.id)}
                              disabled={!!submittingRequestId || !!decliningRequestId}
                            >
                              {submittingRequestId === req.id ? 'Redirecting...' : 'Accept & pay'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeclineOffer(req.id)}
                              disabled={!!submittingRequestId || decliningRequestId === req.id}
                            >
                              {decliningRequestId === req.id ? 'Declining...' : 'Decline'}
                            </Button>
                          </>
                        )}
                        {req.status === 'paid' && (
                          <Button size="sm" variant="outline" onClick={() => setSubmittingRequestId(req.id)}>
                            Submit availability
                          </Button>
                        )}
                      </div>
                    </div>
                    {openAvailabilityFor === req.id && req.status === 'paid' && (
                      <div className="mt-3 p-3 bg-[var(--cp-bg-surface)] rounded-md border border-[var(--cp-border-subtle)]">
                        <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                          When are you available?
                        </label>
                        <textarea
                          value={availabilityText}
                          onChange={(e) => setAvailabilityText(e.target.value)}
                          placeholder="e.g. Mornings next week, or Tue 2pm, Thu 10am"
                          className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSubmitAvailability(req.id)} disabled={submittingAvailability}>
                            {submittingAvailability ? 'Sending...' : 'Submit'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSubmittingRequestId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Available Time Slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slots.length > 0 ? (
                slots.map((slot) => {
                  const isBooked = sessions.some((s) => s.availability_slot_id === slot.id)
                  return (
                    <div
                      key={slot.id}
                      className="border-b border-[var(--cp-border-subtle)] pb-4 last:border-0"
                    >
                      <p className="font-medium text-[var(--cp-text-primary)]">
                        {formatInTz(slot.start_time, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} – {formatInTz(slot.end_time, { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-[var(--cp-text-muted)] mb-2">
                        {slot.is_group_session ? 'Group session' : 'Private session'}
                      </p>
                      {!isBooked && (
                        <Button size="sm" onClick={() => handleRequestSession(slot.id)}>
                          Request session
                        </Button>
                      )}
                      {isBooked && (
                        <span className="text-sm text-[var(--cp-text-muted)]">
                          Already requested
                        </span>
                      )}
                    </div>
                  )
                })
              ) : (
                <EmptyState
                  title="No available slots"
                  description="Your coach will add availability. Check back later."
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="border-b pb-4 last:border-0">
                    <p className="font-medium text-[var(--cp-text-primary)]">
                      {formatInTz(session.scheduled_time, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <span
                      className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                        session.status === 'confirmed'
                          ? 'bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]'
                          : session.status === 'pending'
                            ? 'bg-[var(--cp-accent-warning)]/20 text-[var(--cp-accent-warning)]'
                            : 'bg-[var(--cp-accent-primary-soft)] text-[var(--cp-text-primary)]'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No sessions scheduled"
                  description="Sessions will appear here after you accept an offer and your coach confirms a time."
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ClientSchedulePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClientScheduleContent />
    </Suspense>
  )
}
