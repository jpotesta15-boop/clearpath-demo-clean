'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GENERIC_FAILED } from '@/lib/safe-messages'

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<{ id: string; email: string | null; password?: string } | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [sendInvite, setSendInvite] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Not signed in')
      setSaving(false)
      return
    }
    const clientId = typeof process.env.NEXT_PUBLIC_CLIENT_ID === 'string'
      ? process.env.NEXT_PUBLIC_CLIENT_ID
      : null
    const emailTrimmed = form.email.trim() || null
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        coach_id: user.id,
        full_name: form.full_name.trim(),
        email: emailTrimmed,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        ...(clientId && { client_id: clientId }),
      })
      .select('id')
      .single()
    if (insertError) {
      setError(GENERIC_FAILED)
      setSaving(false)
      return
    }
    let generatedPassword: string | undefined

    if (sendInvite && emailTrimmed) {
      const res = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to send invite')
        setSaving(false)
        return
      }
    } else if (emailTrimmed) {
      // Create a Supabase auth user immediately and surface a password for the coach to share
      const res = await fetch('/api/create-client-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to create login for this client')
        setSaving(false)
        return
      }
      generatedPassword = data.password
    }

    setSaving(false)
    if (newClient?.id) {
      setCreatedCredentials({
        id: newClient.id,
        email: emailTrimmed,
        password: generatedPassword,
      })
    } else {
      router.push('/coach/clients')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 px-2 sm:px-0">
      <div className="flex items-center gap-3">
        <Link
          href="/coach/clients"
          className="text-sm font-medium text-[var(--cp-text-muted)] hover:text-[var(--cp-text-primary)]"
        >
          ← Back to Clients
        </Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Add Client</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          Add a new client and optionally give them portal access.
        </p>
      </div>
      <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)]">
        <CardHeader>
          <CardTitle className="text-[var(--cp-text-primary)]">New client</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)] mt-1">
            1. Client details · 2. Portal access (optional)
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Full name *
              </label>
              <Input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Jordan Lee"
                required
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="client@example.com"
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Phone</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="555-0100"
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes..."
                className="flex min-h-[80px] w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cp-border-focus)]"
                rows={3}
              />
            </div>
            {form.email.trim() && (
              <div className="space-y-2 pt-2 border-t border-[var(--cp-border-subtle)]">
                <p className="text-sm font-medium text-[var(--cp-text-primary)]">2. Portal access</p>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendInvite"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    className="rounded border-[var(--cp-border-subtle)]"
                  />
                  <label htmlFor="sendInvite" className="text-sm text-[var(--cp-text-primary)]">
                    Send invite email (client gets a link to set password and log in)
                  </label>
                </div>
                <p className="text-xs text-[var(--cp-text-muted)]">
                  Leave unchecked to create login now and get a one-time password to share with the client.
                </p>
              </div>
            )}
            {error && (
              <p className="text-sm text-[var(--cp-accent-danger)]">{error}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Add client'}
              </Button>
              <Link href="/coach/clients">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      {createdCredentials && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] border-[var(--cp-accent-success)]/30">
            <CardHeader>
              <CardTitle className="text-[var(--cp-text-primary)]">Client added</CardTitle>
              <p className="text-sm font-normal text-[var(--cp-text-muted)] mt-1">
                Share these details with your client. The password is only shown once.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--cp-text-muted)]">Email</p>
                  <p className="font-medium text-[var(--cp-text-primary)] break-all">{createdCredentials.email ?? '—'}</p>
                </div>
                {createdCredentials.password && (
                  <div>
                    <p className="text-[var(--cp-text-muted)]">Temporary password</p>
                    <p className="font-mono text-[var(--cp-text-primary)] break-all">{createdCredentials.password}</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-[var(--cp-text-muted)]">
                Share the invite link so your client can log in. If you sent an invite email, they can also use the link in that email.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                    const url = createdCredentials.email
                      ? `${origin}/login?email=${encodeURIComponent(createdCredentials.email)}`
                      : `${origin}/login`
                    navigator.clipboard.writeText(url).then(() => {}).catch(() => {})
                  }}
                  className="border-[var(--cp-border-subtle)]"
                >
                  Copy invite link
                </Button>
                {createdCredentials.password && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.password!).catch(() => {})
                    }}
                    className="border-[var(--cp-border-subtle)]"
                  >
                    Copy password
                  </Button>
                )}
                {createdCredentials.id && (
                  <Button
                    type="button"
                    onClick={() => router.push(`/coach/clients/${createdCredentials.id}`)}
                  >
                    Go to client profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
