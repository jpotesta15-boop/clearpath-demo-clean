'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useThemeVariant, type ThemeVariant, type ThemeMode, VARIANT_SWATCH_COLORS } from '@/components/providers/ThemeVariantProvider'
import { updateClientPhoneAction } from './actions'

const VARIANT_LABELS: Record<ThemeVariant, string> = {
  blue: 'Blue',
  orange: 'Orange',
  purple: 'Purple',
  red: 'Red',
  green: 'Green',
  neutral: 'Neutral',
}

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
}

export default function ClientSettingsPage() {
  const { variant, setVariant, mode, setMode } = useThemeVariant()
  const [phone, setPhone] = useState('')
  const [phoneLoading, setPhoneLoading] = useState(true)
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null)
  const supabase = createClient()

  const variants: ThemeVariant[] = ['blue', 'orange', 'purple', 'red', 'green', 'neutral']

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        setPhoneLoading(false)
        return
      }
      const { data: client } = await supabase
        .from('clients')
        .select('phone')
        .eq('email', user.email)
        .limit(1)
        .maybeSingle()
      setPhone(client?.phone ?? '')
      setPhoneLoading(false)
    }
    load()
  }, [])

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneSaving(true)
    setPhoneMessage(null)
    const res = await updateClientPhoneAction(phone.trim() || null)
    setPhoneSaving(false)
    setPhoneMessage(res.error ?? 'Saved.')
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          Personalize how your client dashboard looks. This only affects your view.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact information</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Your phone number is used for session reminders.
          </p>
        </CardHeader>
        <CardContent>
          {phoneLoading ? (
            <div className="space-y-3" aria-label="Loading">
              <div className="h-4 w-32 rounded-md bg-[var(--cp-bg-subtle)] animate-pulse motion-reduce:animate-none" />
              <div className="h-10 w-full max-w-xs rounded-md bg-[var(--cp-bg-subtle)] animate-pulse motion-reduce:animate-none" />
              <div className="h-9 w-16 rounded-md bg-[var(--cp-bg-subtle)] animate-pulse motion-reduce:animate-none" />
            </div>
          ) : (
            <form onSubmit={handleSavePhone} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Phone</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555 123 4567"
                  className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
                />
              </div>
              <Button type="submit" size="sm" disabled={phoneSaving}>
                {phoneSaving ? 'Saving…' : 'Save'}
              </Button>
              {phoneMessage && (
                <p className={`text-sm ${phoneMessage === 'Saved.' ? 'text-[var(--cp-text-muted)]' : 'text-[var(--cp-accent-danger)]'}`}>
                  {phoneMessage}
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme mode</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Dark or light theme.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(['dark', 'light'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                m === mode
                  ? 'border-[var(--cp-accent-primary)] bg-[var(--cp-accent-primary-soft)] text-[var(--cp-accent-primary)]'
                  : 'border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)] hover:border-[var(--cp-accent-primary)] hover:bg-[var(--cp-bg-subtle)]'
              }`}
            >
              {THEME_MODE_LABELS[m]}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accent color</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Accent sets buttons, links, cards, and subtle tints across the site.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {variants.map((v) => {
            const [shade1, shade2, shade3] = VARIANT_SWATCH_COLORS[v]
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                  v === variant
                    ? 'border-[var(--cp-accent-primary)] bg-[var(--cp-accent-primary-soft)]'
                    : 'border-[var(--cp-border-subtle)] hover:border-[var(--cp-accent-primary)] hover:bg-[var(--cp-bg-subtle)]'
                }`}
              >
                <span className="text-sm font-medium text-[var(--cp-text-primary)]">
                  {VARIANT_LABELS[v]}
                </span>
                <span className="mt-1 inline-flex items-center gap-1">
                  <span className="h-2 w-6 rounded-full shrink-0" style={{ backgroundColor: shade1 }} />
                  <span className="h-2 w-6 rounded-full shrink-0" style={{ backgroundColor: shade2 }} />
                  <span className="h-2 w-6 rounded-full shrink-0" style={{ backgroundColor: shade3 }} />
                </span>
              </button>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

