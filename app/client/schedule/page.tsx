'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { getClientId } from '@/lib/config'

function ClientScheduleContent() {
  const [slots, setSlots] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionRequests, setSessionRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<any>(null)
  const [submittingRequestId, setSubmittingRequestId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [decliningRequestId, setDecliningRequestId] = useState<string | null>(null)
  const [availabilityText, setAvailabilityText] = useState('')
  const [submittingAvailability, setSubmittingAvailability] = useState(false)
  const [coachTimezone, setCoachTimezone] = useState<string | null>(null)
  const [timeRequestText, setTimeRequestText] = useState('')
  const [submittingTimeRequest, setSubmittingTimeRequest] = useState(false)
  const [timeRequests, setTimeRequests] = useState<any[]>([])
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()
  const tenantId = getClientId()

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

    const [slotsRes, sessionsRes, requestsRes, timeRequestsRes] = await Promise.all([
      supabase
        .from('availability_slots')
        .select('*, session_products(name, price_cents)')
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
      supabase
        .from('client_time_requests')
        .select('*')
        .eq('client_id', clientData.id)
        .order('created_at', { ascending: false }),
    ])

    setSlots(slotsRes.data || [])
    setSessions(sessionsRes.data || [])
    setSessionRequests(requestsRes.data || [])
    setTimeRequests(timeRequestsRes.data || [])
    setLoading(false)
  }

  const handleAcceptOffer = async (requestId: string) => {
    setPayError(null)
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
      setPayError(data?.error ?? 'Could not start payment. Please try again.')
      setSubmittingRequestId(null)
    } catch {
      setPayError('Could not start payment. Please try again.')
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

  const handleSubmitTimeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client || !timeRequestText.trim() || submittingTimeRequest) return
    setSubmittingTimeRequest(true)
    const { error } = await supabase.from('client_time_requests').insert({
      client_id: client.id,
      coach_id: client.coach_id,
      tenant_id: tenantId,
      preferred_times: timeRequestText.trim(),
      status: 'pending',
    })
    if (!error) {
      setTimeRequestText('')
      loadData()
    }
    setSubmittingTimeRequest(false)
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

  const handleBookAndPay = async (slotId: string) => {
    if (!client) return

    const slot = slots.find((s) => s.id === slotId)
    if (!slot || !slot.session_product_id) return

    const heldRequest = sessionRequests.find(
      (r) =>
        r.availability_slot_id === slotId &&
        ['payment_pending', 'paid', 'scheduled'].includes(r.status)
    )
    const isBooked = sessions.some((s) => s.availability_slot_id === slotId)
    if (heldRequest || isBooked) {
      await loadData()
      return
    }

    const product = slot.session_products as any
    const amountCents = product?.price_cents ?? 0

    const { data: sessionRequest, error } = await supabase
      .from('session_requests')
      .insert({
        coach_id: client.coach_id,
        client_id: client.id,
        session_product_id: slot.session_product_id,
        tenant_id: tenantId,
        status: 'accepted',
        amount_cents: amountCents,
        availability_slot_id: slot.id,
      })
      .select('id')
      .single()

    if (error || !sessionRequest) return

    setPayError(null)
    setSubmittingRequestId(sessionRequest.id)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_request_id: sessionRequest.id }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (data.url) {
        window.location.href = data.url
        return
      }
      setPayError(data?.error ?? 'Could not start payment. Please try again.')
    } catch {
      setPayError('Could not start payment. Please try again.')
    }
    setSubmittingRequestId(null)
  }

  const handleCancelSession = async (sessionId: string) => {
    setCancellingSessionId(sessionId)
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
    if (!error) {
      await loadData()
    }
    setCancellingSessionId(null)
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
          Request sessions and respond to offers from your coach.
        </p>
        <p className="mt-0.5 text-xs text-[var(--cp-text-muted)]">
          Times in {displayTz}
        </p>
        {searchParams.get('cancelled') === '1' && (
          <p className="mt-2 text-xs text-[var(--cp-text-muted)]">
            Your last checkout was cancelled. You can resume payment from the Session offers section below.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request a session</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Tell your coach when you&apos;re free. They&apos;ll send you an offer to book.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitTimeRequest} className="space-y-2">
            <textarea
              value={timeRequestText}
              onChange={(e) => setTimeRequestText(e.target.value)}
              placeholder="e.g. I'm free Tue 5–7pm, Thu mornings, or next week after 3pm"
              className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
              rows={2}
            />
            <Button type="submit" size="sm" disabled={!timeRequestText.trim() || submittingTimeRequest}>
              {submittingTimeRequest ? 'Sending...' : 'Send request'}
            </Button>
          </form>
          {timeRequests.filter((r) => r.status === 'pending').length > 0 && (
            <p className="mt-3 text-xs text-[var(--cp-text-muted)]">
              Pending: {timeRequests.filter((r) => r.status === 'pending').length} request(s) waiting for coach
            </p>
          )}
        </CardContent>
      </Card>

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
                const isOffered = req.status === 'offered' || req.status === 'accepted'
                const isPaymentPending = req.status === 'payment_pending'
                const isPaid = req.status === 'paid'
                const isAvailabilitySubmitted = req.status === 'availability_submitted'
                return (
                  <div
                    key={req.id}
                    className="border-b border-[var(--cp-border-subtle)] pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{name} – ${amount}</p>
                        <p className="text-xs text-[var(--cp-text-muted)]">
                          {isOffered || isPaymentPending
                            ? isPaymentPending
                              ? 'Resume card payment to confirm this session.'
                              : 'Accept to pay with card.'
                            : isPaid
                              ? 'Paid – submit when you are available.'
                              : isAvailabilitySubmitted
                                ? 'Waiting for coach to confirm time.'
                                : 'Waiting for coach to confirm time.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(isOffered || isPaymentPending) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptOffer(req.id)}
                              disabled={!!submittingRequestId || !!decliningRequestId}
                            >
                              {submittingRequestId === req.id
                                ? 'Redirecting...'
                                : isPaymentPending
                                  ? 'Resume payment'
                                  : 'Accept & pay'}
                            </Button>
                            {isOffered && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeclineOffer(req.id)}
                                disabled={!!submittingRequestId || decliningRequestId === req.id}
                              >
                                {decliningRequestId === req.id ? 'Declining...' : 'Decline'}
                              </Button>
                            )}
                          </>
                        )}
                        {isPaid && (
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
            {payError && (
              <p className="text-sm text-[var(--cp-accent-danger)] mt-3">{payError}</p>
            )}
          </CardContent>
        </Card>
      )}

      {payError && !sessionRequests.filter((r) => ['offered', 'accepted', 'payment_pending', 'paid', 'availability_submitted'].includes(r.status)).length && (
        <p className="text-sm text-[var(--cp-accent-danger)]">{payError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Optional time slots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {slots.length > 0 ? (
                slots.map((slot) => {
                  const isBooked = sessions.some((s) => s.availability_slot_id === slot.id)
                  const product = slot.session_products as any
                  const isPaidSlot = !!slot.session_product_id
                  const heldRequest = sessionRequests.find(
                    (r) =>
                      r.availability_slot_id === slot.id &&
                      ['payment_pending', 'paid', 'scheduled'].includes(r.status)
                  )
                  const isHeld = !!heldRequest
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
                      {isPaidSlot && product && (
                        <p className="text-sm text-[var(--cp-text-muted)] mb-1">
                          {slot.label || product.name} – ${((product.price_cents ?? 0) / 100).toFixed(2)}
                        </p>
                      )}
                      {!isBooked && !isHeld && (
                        isPaidSlot ? (
                          <Button size="sm" onClick={() => handleBookAndPay(slot.id)}>
                            Book &amp; pay
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleRequestSession(slot.id)}>
                            Request session
                          </Button>
                        )
                      )}
                      {(isBooked || isHeld) && (
                        <span className="text-sm text-[var(--cp-text-muted)]">
                          {isPaidSlot ? 'No longer available' : 'Already requested'}
                        </span>
                      )}
                    </div>
                  )
                })
              ) : (
                <EmptyState
                  title="No special time slots"
                  description="Your coach will usually send you offers after you request times."
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
                sessions.map((session) => {
                  const isUpcoming =
                    session.status === 'confirmed' &&
                    new Date(session.scheduled_time) > new Date()
                  return (
                    <div key={session.id} className="border-b pb-4 last:border-0">
                      <p className="font-medium text-[var(--cp-text-primary)]">
                        {formatInTz(session.scheduled_time, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded ${
                            session.status === 'confirmed'
                              ? 'bg-[var(--cp-accent-success)]/20 text-[var(--cp-accent-success)]'
                              : session.status === 'pending'
                                ? 'bg-[var(--cp-accent-warning)]/20 text-[var(--cp-accent-warning)]'
                                : 'bg-[var(--cp-accent-primary-soft)] text-[var(--cp-text-primary)]'
                          }`}
                        >
                          {session.status}
                        </span>
                        {isUpcoming && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelSession(session.id)}
                            disabled={cancellingSessionId === session.id}
                          >
                            {cancellingSessionId === session.id ? 'Cancelling…' : 'Request cancel'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
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
