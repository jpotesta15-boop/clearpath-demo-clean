'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ActionRow } from '@/components/ui/ActionRow'
import { Loading } from '@/components/ui/loading'
import { Modal } from '@/components/ui/modal'
import { getClientId } from '@/lib/config'
import { format } from 'date-fns'

function paymentStatusToKind(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'succeeded' || status === 'recorded_manual') return 'success'
  if (status === 'refunded') return 'info'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

export default function CoachPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([])
  const [clientsById, setClientsById] = useState<Record<string, { full_name: string }>>({})
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterProvider, setFilterProvider] = useState<string>('')
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [recordForm, setRecordForm] = useState({ clientId: '', amountDollars: '', provider: 'zelle' as string, description: '' })
  const [recordSubmitting, setRecordSubmitting] = useState(false)
  const [recordError, setRecordError] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const supabase = createClient()
  const tenantId = getClientId()

  useEffect(() => {
    loadPayments()
    loadClients()
  }, [])

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('coach_id', user.id)
      .order('full_name')
    setClients(data ?? [])
  }

  const loadPayments = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .eq('coach_id', user.id)
      .eq('client_id', tenantId)
      .order('created_at', { ascending: false })

    setPayments(paymentsData ?? [])

    const clientIds = [...new Set((paymentsData ?? []).map((p: any) => p.payer_client_id).filter(Boolean))]
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, full_name')
        .in('id', clientIds)
      const map: Record<string, { full_name: string }> = {}
      ;(clientsData ?? []).forEach((c: any) => { map[c.id] = { full_name: c.full_name } })
      setClientsById(map)
    }
    setLoading(false)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountCents = Math.round(parseFloat(recordForm.amountDollars) * 100)
    if (!recordForm.clientId || !Number.isFinite(amountCents) || amountCents <= 0) {
      setRecordError('Select a client and enter a valid amount.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setRecordSubmitting(true)
    setRecordError(null)
    const { error } = await supabase.from('payments').insert({
      coach_id: user.id,
      client_id: tenantId,
      payer_client_id: recordForm.clientId,
      amount_cents: amountCents,
      currency: 'usd',
      status: 'recorded_manual',
      provider: recordForm.provider,
      description: recordForm.description.trim() || null,
    })
    if (!error) {
      setShowRecordModal(false)
      setRecordForm({ clientId: '', amountDollars: '', provider: 'zelle', description: '' })
      loadPayments()
    } else {
      setRecordError('Failed to record payment. Please try again.')
    }
    setRecordSubmitting(false)
  }

  const filtered = payments.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterProvider && p.provider !== filterProvider) return false
    return true
  })

  const statusLabel: Record<string, string> = {
    succeeded: 'Confirmed',
    recorded_manual: 'Recorded',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  }
  const providerLabel: Record<string, string> = {
    stripe: 'Stripe',
    zelle: 'Zelle',
    paypal: 'PayPal',
    cashapp: 'Cash App',
    other: 'Other',
  }

  const handleMarkRefunded = async (paymentId: string) => {
    setRefundingId(paymentId)
    const { error } = await supabase
      .from('payments')
      .update({ status: 'refunded' })
      .eq('id', paymentId)
    if (!error) {
      await loadPayments()
    }
    setRefundingId(null)
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payments"
        subtitle="All payments and revenue. Filter by status or provider."
        primaryAction={<Button onClick={() => setShowRecordModal(true)}>Record payment</Button>}
      />

      <Modal
        open={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        preventClose={recordSubmitting}
        className="p-6"
      >
        <h3 className="text-lg font-semibold text-[var(--cp-text-primary)]">Record manual payment</h3>
        <p className="text-sm text-[var(--cp-text-muted)] mt-1">For payments received via Zelle, PayPal, Cash App, etc.</p>
            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Client</label>
                <select
                  value={recordForm.clientId}
                  onChange={(e) => setRecordForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-[var(--cp-text-primary)]"
                  required
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={recordForm.amountDollars}
                  onChange={(e) => setRecordForm((f) => ({ ...f, amountDollars: e.target.value }))}
                  placeholder="0.00"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Provider</label>
                <select
                  value={recordForm.provider}
                  onChange={(e) => setRecordForm((f) => ({ ...f, provider: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-[var(--cp-text-primary)]"
                >
                  <option value="zelle">Zelle</option>
                  <option value="paypal">PayPal</option>
                  <option value="cashapp">Cash App</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Description (optional)</label>
                <Input
                  value={recordForm.description}
                  onChange={(e) => setRecordForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Session 3/15"
                  className="mt-1"
                />
              </div>
              {recordError && (
                <p className="text-sm text-[var(--cp-accent-danger)]" role="alert">{recordError}</p>
              )}
              <ActionRow>
                <Button type="button" variant="outline" onClick={() => setShowRecordModal(false)} disabled={recordSubmitting}>Cancel</Button>
                <Button type="submit" disabled={recordSubmitting}>{recordSubmitting ? 'Saving…' : 'Record'}</Button>
              </ActionRow>
            </form>
      </Modal>

      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs text-[var(--cp-text-muted)]">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="mt-0.5 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
          >
            <option value="">All</option>
            <option value="succeeded">Confirmed</option>
            <option value="recorded_manual">Recorded</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--cp-text-muted)]">Provider</label>
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="mt-0.5 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
          >
            <option value="">All</option>
            <option value="stripe">Stripe</option>
            <option value="zelle">Zelle</option>
            <option value="paypal">PayPal</option>
            <option value="cashapp">Cash App</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <Card variant="raised">
        <CardContent className="p-5 sm:p-6">
          <SectionHeader title="Payment history" className="mb-4" />
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--cp-border-subtle)] text-left text-[var(--cp-text-muted)]">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Client</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Provider</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--cp-border-subtle)]">
                      <td className="py-3 pr-4 text-[var(--cp-text-primary)]">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                      <td className="py-3 pr-4 text-[var(--cp-text-primary)]">{p.description ?? '—'}</td>
                      <td className="py-3 pr-4 text-[var(--cp-text-primary)]">{p.payer_client_id ? (clientsById[p.payer_client_id]?.full_name ?? '—') : '—'}</td>
                      <td className="py-3 pr-4 font-medium text-[var(--cp-text-primary)]">${((p.amount_cents ?? 0) / 100).toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={paymentStatusToKind(p.status)} label={statusLabel[p.status] ?? p.status} />
                      </td>
                      <td className="py-3 pr-4 text-[var(--cp-text-muted)]">{providerLabel[p.provider] ?? p.provider}</td>
                      <td className="py-3">
                        {p.provider === 'stripe' && p.status === 'succeeded' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkRefunded(p.id)}
                            disabled={refundingId === p.id}
                          >
                            {refundingId === p.id ? 'Marking…' : 'Mark refunded'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              title="No payments yet"
              description="Record one when you receive payment from a client."
              action={{ label: "Record payment", onClick: () => setShowRecordModal(true) }}
            />
          ) : (
            <EmptyState
              title="No payments match the filters"
              description="Try changing or clearing the filters."
              className="py-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
