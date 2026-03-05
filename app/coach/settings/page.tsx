'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useThemeVariant, type ThemeVariant, type ThemeMode } from '@/components/providers/ThemeVariantProvider'

const VARIANT_LABELS: Record<ThemeVariant, string> = {
  blue: 'Blue',
  green: 'Green',
  red: 'Red',
  purple: 'Purple',
  amber: 'Amber',
  teal: 'Teal',
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
]

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System',
}

export default function CoachSettingsPage() {
  const { variant, setVariant, mode, setMode } = useThemeVariant()
  const [displayName, setDisplayName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [defaultSessionMinutes, setDefaultSessionMinutes] = useState(45)
  const [notifySessionBooked, setNotifySessionBooked] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [tagline, setTagline] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()
  const variants: ThemeVariant[] = ['blue', 'green', 'red', 'purple', 'amber', 'teal']

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, timezone, preferences, logo_url, tagline')
        .eq('id', user.id)
        .single()
      if (profile) {
        setDisplayName(profile.display_name ?? '')
        setTimezone(profile.timezone ?? '')
        const prefs = (profile.preferences as Record<string, unknown>) ?? {}
        setBusinessName((prefs.business_name as string) ?? '')
        setDefaultSessionMinutes(
          typeof prefs.default_session_duration_minutes === 'number'
            ? prefs.default_session_duration_minutes
            : 45
        )
        setNotifySessionBooked(prefs.notify_session_booked === true)
        setLogoUrl(profile.logo_url ?? '')
        setTagline(profile.tagline ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        timezone: timezone || null,
        preferences: {
          default_session_duration_minutes: defaultSessionMinutes,
          business_name: businessName.trim() || null,
          notify_session_booked: notifySessionBooked,
        },
        logo_url: logoUrl.trim() || null,
        tagline: tagline.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Saved.')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          Personalize your dashboard theme and preferences. Changes only affect your view.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme mode</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Dark, light, or follow your device setting.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(['dark', 'light', 'system'] as const).map((m) => (
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
            Choose an accent color. All pages will update to match.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {variants.map((v) => (
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
                <span className="h-2 w-6 rounded-full bg-[var(--cp-accent-primary)]" />
                <span className="h-2 w-6 rounded-full bg-[var(--cp-accent-primary-strong)] opacity-80" />
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display name</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Name shown in the sidebar. Leave blank to use your organization brand name.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Sidebar label
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. My Coaching"
                className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Business / organization name
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Fitness"
                className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                For invoices or client-facing labels. Optional.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Time zone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full max-w-xs h-10 rounded-md border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] px-3 py-2 text-sm text-[var(--cp-text-primary)]"
              >
                <option value="">Use browser default</option>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Used when showing schedule times in your local time.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Default session duration (minutes)
              </label>
              <Input
                type="number"
                min={15}
                max={180}
                step={15}
                value={defaultSessionMinutes}
                onChange={(e) => setDefaultSessionMinutes(parseInt(e.target.value, 10) || 45)}
                className="max-w-[8rem] bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Default when creating availability or session packages.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notify_session_booked"
                checked={notifySessionBooked}
                onChange={(e) => setNotifySessionBooked(e.target.checked)}
                className="rounded border-[var(--cp-border-subtle)]"
              />
              <label htmlFor="notify_session_booked" className="text-sm text-[var(--cp-text-primary)]">
                Email me when a session is booked
              </label>
            </div>
            <p className="text-xs text-[var(--cp-text-muted)]">
              Notification preferences. More options may be added later.
            </p>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Logo URL
              </label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Optional. Shown in the sidebar. Use a direct image URL.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Tagline
              </label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Your journey to peak performance"
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Optional. Short line shown on your dashboard.
              </p>
            </div>
            {message && (
              <p className={`text-sm ${message === 'Saved.' ? 'text-[var(--cp-accent-success)]' : 'text-[var(--cp-accent-danger)]'}`}>
                {message}
              </p>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
