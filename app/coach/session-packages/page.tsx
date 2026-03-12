'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { getClientId } from '@/lib/config'
import { GENERIC_FAILED } from '@/lib/safe-messages'

export default function SessionPackagesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [clients, setClients] = useState<{ id: string; full_name: string; email: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sendToClientProduct, setSendToClientProduct] = useState<any>(null)
  const [sendToClientId, setSendToClientId] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    goal: '',
    duration_minutes: 45,
    price_cents: 3000,
    max_participants: 1,
  })
  const supabase = createClient()
  const tenantId = getClientId()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [productsRes, clientsRes] = await Promise.all([
      supabase
        .from('session_products')
        .select('*')
        .eq('coach_id', user.id)
        .eq('client_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('id, full_name, email')
        .eq('coach_id', user.id)
        .order('full_name'),
    ])

    setProducts(productsRes.data || [])
    setClients(clientsRes.data || [])
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setError(null)
    const { error: err } = await supabase.from('session_products').insert({
      coach_id: user.id,
      client_id: tenantId,
      ...form,
    })
    if (!err) {
      setShowForm(false)
      setForm({ name: '', description: '', goal: '', duration_minutes: 45, price_cents: 3000, max_participants: 1 })
      loadData()
    } else {
      setError(err.message)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setError(null)
    const { error: err } = await supabase
      .from('session_products')
      .update({
        name: form.name,
        description: form.description || null,
        goal: form.goal || null,
        duration_minutes: form.duration_minutes,
        price_cents: form.price_cents,
        max_participants: form.max_participants,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingId)
    if (!err) {
      setEditingId(null)
      loadData()
    } else {
      setError(err.message)
    }
  }

  const handleSendToClient = async () => {
    if (!sendToClientProduct || !sendToClientId) return
    const client = clients.find((c) => c.id === sendToClientId)
    if (!client) return
    setSending(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: requestRow, error: reqErr } = await supabase
      .from('session_requests')
      .insert({
        coach_id: user.id,
        client_id: sendToClientId,
        session_product_id: sendToClientProduct.id,
        tenant_id: tenantId,
        amount_cents: sendToClientProduct.price_cents,
        status: 'offered',
      })
      .select('id')
      .single()

    if (reqErr) {
      setError(GENERIC_FAILED)
      setSending(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', client.email)
      .maybeSingle()

    if (profile?.id) {
      const amount = (sendToClientProduct.price_cents / 100).toFixed(2)
      await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: profile.id,
        client_id: tenantId,
        content: `You have a new session offer: ${sendToClientProduct.name} – $${amount}. Accept it from your Schedule page.`,
      })
    }

    setSendToClientProduct(null)
    setSendToClientId('')
    setSending(false)
    loadData()
  }

  const startEdit = (p: any) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description ?? '',
      goal: p.goal ?? '',
      duration_minutes: p.duration_minutes ?? 45,
      price_cents: p.price_cents ?? 0,
      max_participants: p.max_participants ?? 1,
    })
  }

  const setInactive = async (id: string) => {
    await supabase.from('session_products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
    loadData()
  }

  if (loading) return <PageSkeleton />

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-[var(--cp-accent-danger)]/10 border border-[var(--cp-accent-danger)] px-4 py-2 text-sm text-[var(--cp-accent-danger)]">
          {error}
        </div>
      )}
      <PageHeader
        title="Session Packages"
        subtitle="Create sellable sessions (e.g. single $30/45min, group $70). Send offers to clients from here."
        primaryAction={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Create Package'}
          </Button>
        }
      />

      {showForm && (
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="New Session Package" className="mb-4" />
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Single 45min Session"
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Goal</label>
                <Input
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder="e.g. Technique focus"
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Duration (minutes)</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value, 10) || 45 }))}
                    className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Price ($)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price_cents / 100}
                    onChange={(e) => setForm((f) => ({ ...f, price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) }))}
                    className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Max participants</label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_participants}
                  onChange={(e) => setForm((f) => ({ ...f, max_participants: parseInt(e.target.value, 10) || 1 }))}
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                />
              </div>
              <Button type="submit">Create Package</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {editingId && (
        <Card variant="raised">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="Edit Package" className="mb-4" />
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Goal</label>
                <Input
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Duration (minutes)</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value, 10) || 45 }))}
                    className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Price ($)</label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price_cents / 100}
                    onChange={(e) => setForm((f) => ({ ...f, price_cents: Math.round((parseFloat(e.target.value) || 0) * 100) }))}
                    className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Max participants</label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_participants}
                  onChange={(e) => setForm((f) => ({ ...f, max_participants: parseInt(e.target.value, 10) || 1 }))}
                  className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)]"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.filter((p) => p.is_active !== false).map((product) => (
          <Card key={product.id} variant="raised">
            <CardContent className="p-5 sm:p-6">
            <div className="flex flex-row items-start gap-3">
              <span className="flex-shrink-0 rounded-lg bg-[var(--cp-accent-primary-soft)] p-2 text-[var(--cp-accent-primary)]" aria-hidden>
                {product.max_participants > 1 ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-[var(--cp-text-primary)]">{product.name}</h3>
                <p className="text-lg font-semibold text-[var(--cp-accent-primary)] mt-1">
                  ${(product.price_cents / 100).toFixed(2)} · {product.duration_minutes} min
                  {product.max_participants > 1 ? ` · Up to ${product.max_participants} people` : ''}
                </p>
              </div>
            </div>
            <div className="space-y-3 mt-3">
              <p className="text-sm text-[var(--cp-text-muted)]">
                {product.description || 'Add a description in Edit to help clients understand this package.'}
              </p>
              {product.goal && (
                <p className="text-xs text-[var(--cp-text-subtle)]">Goal: {product.goal}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(product)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSendToClientProduct(product)
                    setSendToClientId('')
                  }}
                >
                  Send to client
                </Button>
                <Button size="sm" variant="ghost" className="text-[var(--cp-text-muted)]" onClick={() => setInactive(product.id)}>
                  Archive
                </Button>
              </div>
            </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.filter((p) => p.is_active !== false).length === 0 && (
        <EmptyState
          title="No session packages yet"
          description="Create one to start sending offers."
          action={{ label: "Create package", onClick: () => setShowForm(true) }}
        />
      )}

      <Modal
        open={!!sendToClientProduct}
        onClose={() => !sending && setSendToClientProduct(null)}
        preventClose={!!sending}
      >
        <div className="p-6 text-[var(--cp-text-primary)]">
          <h3 className="text-lg font-semibold">Send offer to client</h3>
          <p className="text-sm text-[var(--cp-text-muted)] mt-1">
            {sendToClientProduct?.name} – ${((sendToClientProduct?.price_cents ?? 0) / 100).toFixed(2)}
          </p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-[var(--cp-text-primary)]">Select client</label>
            <select
              value={sendToClientId}
              onChange={(e) => setSendToClientId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-[var(--cp-text-primary)]"
            >
              <option value="">Choose...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setSendToClientProduct(null)} disabled={sending}>Cancel</Button>
            <Button onClick={handleSendToClient} disabled={!sendToClientId || sending}>
              {sending ? 'Sending...' : 'Send offer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
