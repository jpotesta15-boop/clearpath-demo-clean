'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { getClientId } from '@/lib/config'
import { MessageThread, type ChatMessage } from '@/components/chat/MessageThread'

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [sessionProducts, setSessionProducts] = useState<any[]>([])
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()
  const tenantId = getClientId()

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (selectedClient && clients.length > 0) {
      loadMessages()
    }
  }, [selectedClient, clients])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('coach_id', user.id)
      .order('full_name', { ascending: true })

    setClients(data || [])
    const clientFromUrl = searchParams.get('client')
    if (clientFromUrl && data?.some((c) => c.id === clientFromUrl)) {
      setSelectedClient(clientFromUrl)
    } else if (data && data.length > 0 && !selectedClient) {
      setSelectedClient(data[0].id)
    }
  }

  const loadMessages = async () => {
    if (!selectedClient || !currentUser) return

    const client = clients.find((c) => c.id === selectedClient)
    if (!client) return

    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', client.email)
      .maybeSingle()

    if (!clientProfile) {
      setMessages([])
      return
    }

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUser.id},recipient_id.eq.${clientProfile.id}),and(sender_id.eq.${clientProfile.id},recipient_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true })

    setMessages(data || [])

    const unreadIds = (data || []).filter((m: any) => m.recipient_id === currentUser.id && !m.read_at).map((m: any) => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendError(null)
    if (!selectedClient || !newMessage.trim() || !currentUser) return

    const client = clients.find((c) => c.id === selectedClient)
    if (!client) return

    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', client.email)
      .maybeSingle()

    if (!clientProfile) {
      setSendError("This client doesn't have an account linked yet.")
      return
    }

    const contentToSend = newMessage.trim()
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        recipient_id: clientProfile.id,
        client_id: tenantId,
        content: contentToSend,
      })

    if (error) {
      setSendError('Failed to send. Please try again.')
      return
    }

    setSendError(null)
    setNewMessage('')
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        sender_id: currentUser.id,
        recipient_id: clientProfile.id,
        content: contentToSend,
        created_at: new Date().toISOString(),
      },
    ])
    await loadMessages()
  }

  const ensureSessionProductsLoaded = async () => {
    if (sessionProducts.length > 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('session_products')
      .select('*')
      .eq('coach_id', user.id)
      .eq('client_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (!error && data) {
      setSessionProducts(data)
      if (data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id)
      }
    }
  }

  const openRequestSession = async () => {
    if (!selectedClient) return
    setRequestError(null)
    setShowRequestModal(true)
    await ensureSessionProductsLoaded()
  }

  const handleSendSessionRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !currentUser || !selectedProductId) return

    const client = clients.find((c) => c.id === selectedClient)
    if (!client) return
    const product = sessionProducts.find((p) => p.id === selectedProductId)
    if (!product) return

    setRequestLoading(true)
    setRequestError(null)

    try {
      const { data: sessionRequest, error: reqError } = await supabase
        .from('session_requests')
        .insert({
          coach_id: currentUser.id,
          client_id: client.id,
          session_product_id: product.id,
          tenant_id: tenantId,
          status: 'offered',
          amount_cents: product.price_cents ?? 0,
        })
        .select('id')
        .maybeSingle()

      if (reqError) {
        setRequestError(reqError.message)
        setRequestLoading(false)
        return
      }

      if (client.email) {
        const { data: clientProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', client.email)
          .maybeSingle()

        if (clientProfile?.id && sessionRequest?.id) {
          const amount = ((product.price_cents ?? 0) / 100).toFixed(2)
          const offerPayload = JSON.stringify({
            type: 'session_offer',
            session_request_id: sessionRequest.id,
            product_name: product.name,
            amount_cents: product.price_cents ?? 0,
            amount_display: amount,
          })
          await supabase.from('messages').insert({
            sender_id: currentUser.id,
            recipient_id: clientProfile.id,
            client_id: tenantId,
            content: offerPayload,
          })
          await loadMessages()
        }
      }

      setShowRequestModal(false)
      setSelectedProductId('')
      setRequestLoading(false)
    } catch (e: any) {
      setRequestError(e?.message ?? 'Unable to send session request')
      setRequestLoading(false)
    }
  }

  const selectedClientData = clients.find((c) => c.id === selectedClient)

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
      senderLabel: !isOwn ? selectedClientData?.full_name ?? 'Client' : undefined,
      offer,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Messages</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Communicate with your clients</p>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-elevated)] p-8 text-center shadow-[var(--cp-shadow-soft)]">
          <p className="text-[var(--cp-text-muted)]">Add clients to start messaging. Once you have clients, you can send and receive messages here.</p>
          <Link
            href="/coach/clients/new"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--cp-accent-primary)] px-4 py-2 text-sm font-medium text-[var(--cp-text-on-accent)] hover:opacity-90"
          >
            Add your first client
          </Link>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="border border-[var(--cp-border-subtle)] shadow-[var(--cp-shadow-soft)]">
          <CardContent className="p-0">
            <div className="p-4 border-b border-[var(--cp-border-subtle)] bg-[rgba(15,23,42,0.6)]">
              <h3 className="font-semibold text-[var(--cp-text-primary)]">Clients</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClient(client.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-[rgba(148,163,184,0.12)] transition-colors ${
                    selectedClient === client.id
                      ? 'bg-[var(--cp-accent-primary-soft)] border-l-2 border-l-[var(--cp-accent-primary)]'
                      : ''
                  }`}
                >
                  <p className="font-medium text-[var(--cp-text-primary)]">{client.full_name}</p>
                  {client.email && (
                    <p className="text-xs text-[var(--cp-text-muted)] truncate">{client.email}</p>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 flex flex-col min-h-[480px]">
          <Card className="border border-[var(--cp-border-subtle)] shadow-[var(--cp-shadow-soft)] flex-1 flex flex-col overflow-hidden">
            {selectedClient ? (
              <>
                <div className="px-4 py-3 border-b border-[var(--cp-border-subtle)] bg-[rgba(15,23,42,0.6)] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--cp-text-primary)]">
                      {selectedClientData?.full_name ?? 'Client'}
                    </p>
                    <p className="text-xs text-[var(--cp-text-muted)]">
                      {selectedClientData?.email ?? 'No email'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!selectedClientData}
                      onClick={() => openRequestSession()}
                    >
                      Request session
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  <div className="space-y-3">
                    {messages.length === 0 && (
                      <EmptyState
                        title="No messages yet"
                        description="Send one below."
                        className="py-8"
                      />
                    )}
                    {messages.length > 0 && (
                      <MessageThread
                        messages={chatMessages}
                        context="coach"
                        bottomRef={messagesEndRef}
                      />
                    )}
                  </div>
                </div>
                {sendError && (
                  <p className="px-4 pt-2 text-sm text-[var(--cp-accent-danger)]">{sendError}</p>
                )}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-[var(--cp-border-subtle)] bg-[var(--cp-bg-subtle)]"
                >
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        if (sendError) setSendError(null)
                      }}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit">
                      Send
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-gray-500 text-center">
                  Select a client from the list to view and send messages.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
      )}

      {showRequestModal && selectedClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !requestLoading && setShowRequestModal(false)}
        >
          <div
            className="bg-[var(--cp-bg-elevated)] border border-[var(--cp-border-subtle)] rounded-xl shadow-xl max-w-md w-full p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[var(--cp-text-primary)]">Request session</h2>
              <button
                type="button"
                onClick={() => !requestLoading && setShowRequestModal(false)}
                className="text-sm text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)]"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-[var(--cp-text-muted)]">
              Choose a session type to offer to {selectedClientData?.full_name ?? 'this client'}. They&apos;ll see it on their
              Schedule page and can accept, pay, and share when they&apos;re available.
            </p>
            {sessionProducts.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-[var(--cp-text-muted)]">
                  You don&apos;t have any session types yet. Create one from Session Packages, then come back to send an offer.
                </p>
                <Link
                  href="/coach/session-packages"
                  className="text-sm font-medium text-[var(--cp-accent-primary)] hover:text-[var(--cp-accent-primary-strong)]"
                  onClick={() => setShowRequestModal(false)}
                >
                  Open Session Packages →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSendSessionRequest} className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--cp-text-muted)] mb-1">Session type</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Select a session type…</option>
                    {sessionProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} – ${((p.price_cents ?? 0) / 100).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                {requestError && (
                  <p className="text-xs text-[var(--cp-accent-danger)]">{requestError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => !requestLoading && setShowRequestModal(false)}
                    disabled={requestLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={requestLoading || !selectedProductId}>
                    {requestLoading ? 'Sending…' : 'Send request'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

