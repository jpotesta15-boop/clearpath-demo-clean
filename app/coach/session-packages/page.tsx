'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getClientId } from '@/lib/config'

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
      setError(reqErr.message)
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

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Session Packages</h1>
          <p className="mt-1 text-sm text-gray-500">Create sellable sessions (e.g. single $30/45min, group $70). Send offers to clients from here.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Package'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Session Package</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Single 45min Session"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Goal</label>
                <Input
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                  placeholder="e.g. Technique focus"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value, 10) || 45 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (cents)</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price_cents}
                    onChange={(e) => setForm((f) => ({ ...f, price_cents: parseInt(e.target.value, 10) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-0.5">e.g. 3000 = $30.00</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max participants</label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_participants}
                  onChange={(e) => setForm((f) => ({ ...f, max_participants: parseInt(e.target.value, 10) || 1 }))}
                />
              </div>
              <Button type="submit">Create Package</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {editingId && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Package</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Goal</label>
                <Input
                  value={form.goal}
                  onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value, 10) || 45 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (cents)</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.price_cents}
                    onChange={(e) => setForm((f) => ({ ...f, price_cents: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max participants</label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_participants}
                  onChange={(e) => setForm((f) => ({ ...f, max_participants: parseInt(e.target.value, 10) || 1 }))}
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
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <p className="text-lg font-semibold text-primary-600 mt-1">
                ${(product.price_cents / 100).toFixed(2)} · {product.duration_minutes} min
                {product.max_participants > 1 ? ` · Up to ${product.max_participants} people` : ''}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.description && (
                <p className="text-sm text-gray-600">{product.description}</p>
              )}
              {product.goal && (
                <p className="text-xs text-gray-500">Goal: {product.goal}</p>
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
                <Button size="sm" variant="ghost" className="text-gray-500" onClick={() => setInactive(product.id)}>
                  Archive
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.filter((p) => p.is_active !== false).length === 0 && (
        <p className="text-gray-500">No session packages yet. Create one to start sending offers.</p>
      )}

      {sendToClientProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !sending && setSendToClientProduct(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Send offer to client</h3>
            <p className="text-sm text-gray-600 mt-1">
              {sendToClientProduct.name} – ${(sendToClientProduct.price_cents / 100).toFixed(2)}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Select client</label>
              <select
                value={sendToClientId}
                onChange={(e) => setSendToClientId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
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
        </div>
      )}
    </div>
  )
}
