'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getClientId } from '@/lib/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type DailyMessage = {
  id: string
  content: string
  effective_at: string | null
  created_at: string
}

export default function CoachDailyMessagePage() {
  const supabase = createClient()
  const tenantId = getClientId()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [content, setContent] = useState('')
  const [effectiveAt, setEffectiveAt] = useState('')
  const [current, setCurrent] = useState<DailyMessage | null>(null)
  const [history, setHistory] = useState<DailyMessage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMessages = async () => {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const [latestRes, historyRes] = await Promise.all([
      supabase
        .from('coach_daily_messages')
        .select('*')
        .eq('coach_id', user.id)
        .eq('client_id', tenantId)
        .order('effective_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('coach_daily_messages')
        .select('*')
        .eq('coach_id', user.id)
        .eq('client_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (latestRes.error || historyRes.error) {
      setError('Unable to load your messages right now.')
    }

    const latest = latestRes.data as DailyMessage | null
    setCurrent(latest)
    setContent(latest?.content ?? '')
    setEffectiveAt(latest?.effective_at ?? '')
    setHistory((historyRes.data as DailyMessage[] | null) ?? [])
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || saving) return
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const payload: any = {
      coach_id: user.id,
      client_id: tenantId,
      content: content.trim(),
    }
    if (effectiveAt) {
      payload.effective_at = effectiveAt
    }

    const { error: insertError } = await supabase
      .from('coach_daily_messages')
      .insert(payload)

    if (insertError) {
      setError('Could not save message. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    await loadMessages()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Client-facing message</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          Set a short quote or message that your clients see on their dashboard.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Current message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Message
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)]"
                placeholder="e.g. 'Discipline beats motivation. Show up and the results will follow.'"
              />
              <p className="mt-1 text-xs text-[var(--cp-text-muted)]">
                {content.length}/300 characters
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Date (optional)
              </label>
              <Input
                type="date"
                value={effectiveAt}
                onChange={(e) => setEffectiveAt(e.target.value)}
                className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="mt-1 text-xs text-[var(--cp-text-muted)]">
                Leave blank to just show the latest message.
              </p>
            </div>
            {error && (
              <p className="text-sm text-[var(--cp-accent-danger)]">{error}</p>
            )}
            <Button type="submit" disabled={saving || !content.trim()}>
              {saving ? 'Saving…' : current ? 'Update message' : 'Create message'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Recent messages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[var(--cp-text-muted)]">Loading…</p>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((msg) => (
                <div
                  key={msg.id}
                  className="border-b border-[var(--cp-border-subtle)] pb-3 last:border-0 last:pb-0"
                >
                  <p className="text-sm text-[var(--cp-text-primary)] whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                    {msg.effective_at
                      ? `For ${msg.effective_at}`
                      : 'No specific date'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--cp-text-muted)]">
              No messages yet. Create one above to welcome your clients.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

