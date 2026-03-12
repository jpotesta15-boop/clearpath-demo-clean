'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageThread, type ChatMessage } from '@/components/chat/MessageThread'
import { getClientId } from '@/lib/config'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

export default function ClientMessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [coach, setCoach] = useState<any>(null)
  const [sessionRequests, setSessionRequests] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [clientNotFound, setClientNotFound] = useState(false)
  const [availabilityRequestId, setAvailabilityRequestId] = useState<string | null>(null)
  const [availabilityText, setAvailabilityText] = useState('')
  const [submittingAvailability, setSubmittingAvailability] = useState(false)
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabase = createClient()
  const tenantId = getClientId()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!coach || !currentUser) return

    realtimeChannelRef.current = supabase
      .channel(`client-messages:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any
          if (msg.sender_id === coach.id || msg.recipient_id === coach.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            })
            if (msg.recipient_id === currentUser.id) {
              updateUnreadBadge(currentUser.id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [coach?.id, currentUser?.id])

  const updateUnreadBadge = async (userId: string) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null)

    const totalUnread = count ?? 0
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('clearpath:unread-messages-updated', {
          detail: { totalUnread },
        })
      )
    }
  }

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setPageLoading(false)
      return
    }
    setCurrentUser(user)

    const { data: clientData } = await supabase
      .from('clients')
      .select('*, coach:profiles!clients_coach_id_fkey(*)')
      .eq('email', user.email)
      .single()

    if (!clientData) {
      setClientNotFound(true)
      setPageLoading(false)
      return
    }

    setCoach(clientData.coach)

    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', clientData.coach_id)
      .single()

    if (coachProfile) {
      const [messagesRes, requestsRes] = await Promise.all([
        supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${coachProfile.id}),and(sender_id.eq.${coachProfile.id},recipient_id.eq.${user.id})`)
          .order('created_at', { ascending: true }),
        supabase
          .from('session_requests')
          .select('*, session_products(name, duration_minutes)')
          .eq('client_id', clientData.id)
          .in('status', ['offered', 'accepted', 'payment_pending', 'paid', 'availability_submitted', 'scheduled'])
          .order('created_at', { ascending: false }),
      ])
      const msgs = messagesRes.data || []
      setMessages(msgs)
      setSessionRequests(requestsRes.data || [])

      const unreadIds = msgs.filter((m: any) => m.recipient_id === user.id && !m.read_at).map((m: any) => m.id)
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
        await new Promise((r) => setTimeout(r, 150))
      }

      await updateUnreadBadge(user.id)
    }
    setPageLoading(false)
  }

  const handleAcceptOffer = async (requestId: string) => {
    setPayError(null)
    setPayingRequestId(requestId)
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
      setPayingRequestId(null)
    } catch {
      setPayError('Could not start payment. Please try again.')
      setPayingRequestId(null)
    }
  }

  const handleSubmitAvailability = async () => {
    if (!availabilityRequestId || !availabilityText.trim()) return
    setSubmittingAvailability(true)
    setAvailabilityError(null)
    const { error } = await supabase
      .from('session_requests')
      .update({
        status: 'availability_submitted',
        availability_preferences: { notes: availabilityText.trim() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', availabilityRequestId)
    if (error) {
      setAvailabilityError('Could not submit. Please try again.')
    } else {
      setAvailabilityRequestId(null)
      setAvailabilityText('')
      loadData()
    }
    setSubmittingAvailability(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !coach || !currentUser) return

    setSendError(null)
    const contentToSend = newMessage.trim()

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        recipient_id: coach.id,
        client_id: tenantId,
        content: contentToSend,
      })

    if (error) {
      setSendError('Failed to send. Please try again.')
      return
    }
    setNewMessage('')
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        sender_id: currentUser.id,
        recipient_id: coach.id,
        content: contentToSend,
        created_at: new Date().toISOString(),
      },
    ])
    loadData()
  }

  if (pageLoading) return <PageSkeleton />

  if (clientNotFound) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold text-[var(--cp-text-primary)]">Client not found</h1>
        <p className="text-[var(--cp-text-muted)]">
          There is no client record for this account. Contact your coach to be added and to receive a portal invite.
        </p>
        <Button asChild>
        <Link href="/login">Back to login</Link>
      </Button>
      </div>
    )
  }

  const activeOffers = sessionRequests.filter((r: any) =>
    ['offered', 'accepted', 'payment_pending', 'paid', 'availability_submitted'].includes(r.status)
  )

  const chatMessages: ChatMessage[] = messages.map((message) => {
    const isOwn = message.sender_id === currentUser?.id
    let offer: any = null
    try {
      const parsed = JSON.parse(message.content)
      if (parsed?.type === 'session_offer') offer = parsed
    } catch {
      // not JSON
    }
    return {
      id: String(message.id),
      content: message.content,
      createdAt: message.created_at,
      isOwn,
      offer,
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Messages</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Chat with your coach</p>
      </div>

      <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
        <CardContent className="p-0">
          <div className="p-4 border-b border-[var(--cp-border-subtle)]">
            <h3 className="font-semibold text-[var(--cp-text-primary)]">{coach?.full_name || 'Coach'}</h3>
          </div>
          <div className="p-4 border-b border-[var(--cp-border-subtle)] max-h-[420px] overflow-y-auto">
            {activeOffers.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-medium text-[var(--cp-text-muted)]">Session offers</p>
                {activeOffers.map((req: any) => {
                  const product = req.session_products
                  const name = product?.name ?? 'Session'
                  const amount = ((req.amount_cents ?? 0) / 100).toFixed(2)
                  const isOffered = req.status === 'offered' || req.status === 'accepted'
                  const isPaymentPending = req.status === 'payment_pending'
                  const isPaid = req.status === 'paid'
                  const isScheduled = req.status === 'scheduled'
                  const isAvailabilitySubmitted = req.status === 'availability_submitted'
                  return (
                    <div
                      key={req.id}
                      className="rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-3 text-[var(--cp-text-primary)]"
                    >
                      <p className="text-sm font-semibold">{name} – ${amount}</p>
                      <p className="text-xs text-[var(--cp-text-muted)] mt-0.5">
                        {isScheduled
                          ? 'Session scheduled. Pay now on Schedule if you haven’t yet.'
                          : isAvailabilitySubmitted
                            ? "You're all set. Your coach will confirm the time and it will appear in Schedule."
                            : isPaid
                              ? 'Submit when you’re available on Schedule so your coach can pick a time.'
                              : isPaymentPending
                                ? 'Go to Schedule to resume payment and confirm this session.'
                                : 'Accept & pay to secure this session.'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {isOffered && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOffer(req.id)}
                            disabled={!!payingRequestId}
                          >
                            {payingRequestId === req.id ? 'Redirecting…' : 'Accept & pay'}
                          </Button>
                        )}
                        {isPaid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAvailabilityRequestId(req.id)}
                          >
                            Submit availability
                          </Button>
                        )}
                        {isScheduled && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOffer(req.id)}
                            disabled={!!payingRequestId}
                          >
                            {payingRequestId === req.id ? 'Redirecting…' : 'Pay now'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {payError && (
              <p className="text-sm text-[var(--cp-accent-danger)] mt-3">{payError}</p>
            )}
            <div className="space-y-4">
              <MessageThread messages={chatMessages} context="client" />
            </div>
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--cp-border-subtle)]">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
              />
              <Button type="submit">Send</Button>
            </div>
            {sendError && (
              <p className="text-sm text-[var(--cp-accent-danger)] mt-2">{sendError}</p>
            )}
          </form>
        </CardContent>
      </Card>

      {availabilityRequestId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--cp-bg-backdrop)] p-4"
          onClick={() => !submittingAvailability && (setAvailabilityRequestId(null), setAvailabilityError(null))}
        >
          <div
            className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] shadow-[var(--cp-shadow-card)] max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--cp-text-primary)] mb-2">Share your availability</h3>
            <p className="text-sm text-[var(--cp-text-muted)] mb-3">
              When are you available? Your coach will confirm a time.
            </p>
            {availabilityError && (
              <p className="text-sm text-[var(--cp-accent-danger)] mb-3">{availabilityError}</p>
            )}
            <textarea
              value={availabilityText}
              onChange={(e) => setAvailabilityText(e.target.value)}
              placeholder="e.g. Mornings next week, or Tue 2pm, Thu 10am"
              className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] mb-4 min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setAvailabilityRequestId(null); setAvailabilityError(null) }} disabled={submittingAvailability}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAvailability} disabled={!availabilityText.trim() || submittingAvailability}>
                {submittingAvailability ? 'Sending…' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

