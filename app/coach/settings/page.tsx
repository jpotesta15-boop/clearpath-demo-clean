'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useThemeVariant, type ThemeVariant, type ThemeMode, VARIANT_SWATCH_COLORS } from '@/components/providers/ThemeVariantProvider'

const VARIANT_LABELS: Record<ThemeVariant, string> = {
  blue: 'Blue',
  orange: 'Orange',
  purple: 'Purple',
  red: 'Red',
  green: 'Green',
  neutral: 'Neutral',
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
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const variants: ThemeVariant[] = ['blue', 'orange', 'purple', 'red', 'green', 'neutral']

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

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image (JPEG, PNG, GIF, or WebP).')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image must be under 2 MB.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLogoError(null)
    setLogoUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${user.id}/logo.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    setLogoUploading(false)
    if (error) {
      setLogoError(error.message)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setLogoUrl(publicUrl)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleRemoveLogo = () => {
    setLogoUrl('')
    setLogoError(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

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

      <div className="rounded-lg border border-[var(--cp-border-subtle)] bg-[var(--cp-accent-primary-subtle)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--cp-text-primary)]">Recommended</p>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          Set your display name, business name, and logo so your client portal looks complete. Add a tagline for your dashboard. These appear in the sidebar and client-facing views.
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Profile & preferences</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            Your name, business details, and branding. Recommended fields help your client portal look complete.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Display name
                <span className="text-[10px] font-normal uppercase tracking-wider text-[var(--cp-accent-primary)]">Recommended</span>
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. My Coaching"
                className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Shown in the sidebar. Leave blank to use your business name.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Business / organization name
                <span className="text-[10px] font-normal uppercase tracking-wider text-[var(--cp-accent-primary)]">Recommended</span>
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Fitness"
                className="max-w-xs bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Shown in the client portal and on invoices.
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
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Profile picture / logo
                <span className="text-[10px] font-normal uppercase tracking-wider text-[var(--cp-accent-primary)]">Recommended</span>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {logoUrl && (
                  <div className="relative">
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-16 w-16 rounded-lg border border-[var(--cp-border-subtle)] object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] text-[var(--cp-text-muted)] hover:bg-[var(--cp-accent-danger-soft)] hover:text-[var(--cp-accent-danger)] text-xs leading-none"
                      aria-label="Remove logo"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoFile}
                    disabled={logoUploading}
                    className="text-sm text-[var(--cp-text-primary)] file:mr-2 file:rounded-md file:border-0 file:bg-[var(--cp-accent-primary-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--cp-accent-primary)]"
                  />
                  {logoUploading && <span className="text-xs text-[var(--cp-text-muted)]">Uploading…</span>}
                  {logoError && <span className="text-xs text-[var(--cp-accent-danger)]">{logoError}</span>}
                </div>
              </div>
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Shown in the sidebar and client portal header. Import an image (JPEG, PNG, GIF, or WebP, max 2 MB).
              </p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Tagline
                <span className="text-[10px] font-normal uppercase tracking-wider text-[var(--cp-accent-primary)]">Recommended</span>
              </label>
              <Input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Your journey to peak performance"
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Short line shown on your dashboard and in the client portal.
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
