'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GENERIC_FAILED } from '@/lib/safe-messages'

type IntroVideoSource = 'google_drive' | 'youtube' | 'upload' | ''

interface ClientExperienceRow {
  welcome_title: string | null
  welcome_body: string | null
  hero_image_url: string | null
  intro_video_source: IntroVideoSource | null
  intro_video_url: string | null
  show_welcome_block: boolean | null
}

export default function ClientExperienceSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [welcomeTitle, setWelcomeTitle] = useState('')
  const [welcomeBody, setWelcomeBody] = useState('')
  const [heroUrl, setHeroUrl] = useState('')
  const [introSource, setIntroSource] = useState<IntroVideoSource>('')
  const [introUrl, setIntroUrl] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)

  const [heroUploading, setHeroUploading] = useState(false)
  const [heroError, setHeroError] = useState<string | null>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'coach' || !profile.tenant_id) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('coach_client_experience')
        .select('welcome_title, welcome_body, hero_image_url, intro_video_source, intro_video_url, show_welcome_block')
        .eq('coach_id', user.id)
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle<ClientExperienceRow>()

      if (data) {
        setWelcomeTitle(data.welcome_title ?? '')
        setWelcomeBody(data.welcome_body ?? '')
        setHeroUrl(data.hero_image_url ?? '')
        setIntroSource((data.intro_video_source as IntroVideoSource | null) ?? '')
        setIntroUrl(data.intro_video_url ?? '')
        setShowWelcome(data.show_welcome_block ?? true)
      } else {
        setShowWelcome(true)
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const handleHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setHeroError('Please choose an image (JPEG, PNG, GIF, or WebP).')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setHeroError('Image must be under 3 MB.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setHeroError(null)
    setHeroUploading(true)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${user.id}/portal-hero.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    setHeroUploading(false)

    if (error) {
      setHeroError(GENERIC_FAILED)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setHeroUrl(publicUrl)
    if (heroInputRef.current) heroInputRef.current.value = ''
  }

  const handleRemoveHero = () => {
    setHeroUrl('')
    setHeroError(null)
    if (heroInputRef.current) heroInputRef.current.value = ''
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    setMessage(null)

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      setSaving(false)
      setMessage(GENERIC_FAILED)
      return
    }

    const payload = {
      coach_id: user.id,
      tenant_id: profile.tenant_id,
      welcome_title: welcomeTitle.trim() || null,
      welcome_body: welcomeBody.trim() || null,
      hero_image_url: heroUrl.trim() || null,
      intro_video_source: introSource || null,
      intro_video_url: introUrl.trim() || null,
      show_welcome_block: showWelcome,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('coach_client_experience')
      .upsert(payload, { onConflict: 'coach_id' })

    setSaving(false)

    if (error) {
      setMessage(GENERIC_FAILED)
    } else {
      setMessage('Saved.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-7 w-40 rounded-md bg-[var(--cp-bg-subtle)]" />
        <div className="h-5 w-64 rounded-md bg-[var(--cp-bg-subtle)]" />
        <div className="h-40 rounded-lg bg-[var(--cp-bg-subtle)]" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--cp-text-primary)]">Client portal appearance</h1>
        <p className="mt-1 text-sm text-[var(--cp-text-muted)]">
          Customize what students see when they sign into their portal: welcome text, hero image, and intro video.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome section</CardTitle>
          <p className="text-sm font-normal text-[var(--cp-text-muted)]">
            This appears at the top of the student dashboard. Keep it short, warm, and clear.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-2">
              <input
                id="show_welcome"
                type="checkbox"
                checked={showWelcome}
                onChange={(e) => setShowWelcome(e.target.checked)}
                className="rounded border-[var(--cp-border-subtle)]"
              />
              <label htmlFor="show_welcome" className="text-sm text-[var(--cp-text-primary)]">
                Show welcome section on student dashboard
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Welcome headline
              </label>
              <Input
                value={welcomeTitle}
                onChange={(e) => setWelcomeTitle(e.target.value)}
                placeholder="e.g. Welcome to your training space"
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Shown prominently at the top of the portal.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Welcome message
              </label>
              <Textarea
                value={welcomeBody}
                onChange={(e) => setWelcomeBody(e.target.value)}
                placeholder="Set expectations, how to get started, and how to reach you."
                rows={4}
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Hero image (optional)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {heroUrl && (
                  <div className="relative">
                    <img
                      src={heroUrl}
                      alt="Hero"
                      className="h-20 w-32 rounded-lg border border-[var(--cp-border-subtle)] object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveHero}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full border border-[var(--cp-border-subtle)] bg-[var(--cp-bg-surface)] text-[var(--cp-text-muted)] hover:bg-[var(--cp-accent-danger-soft)] hover:text-[var(--cp-accent-danger)] text-xs leading-none"
                      aria-label="Remove hero image"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleHeroFile}
                    disabled={heroUploading}
                    className="text-sm text-[var(--cp-text-primary)] file:mr-2 file:rounded-md file:border-0 file:bg-[var(--cp-accent-primary-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--cp-accent-primary)]"
                  />
                  {heroUploading && <span className="text-xs text-[var(--cp-text-muted)]">Uploading…</span>}
                  {heroError && <span className="text-xs text-[var(--cp-accent-danger)]">{heroError}</span>}
                </div>
              </div>
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                Wide image works best. Students see this at the top of their dashboard.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">
                Intro video (optional)
              </label>
              <div className="flex flex-wrap gap-3">
                {(['google_drive', 'youtube', 'upload'] as IntroVideoSource[]).map((source) => (
                  <button
                    key={source}
                    type="button"
                    onClick={() => setIntroSource(source)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                      introSource === source
                        ? 'border-[var(--cp-accent-primary)] bg-[var(--cp-accent-primary-soft)] text-[var(--cp-accent-primary)]'
                        : 'border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)] hover:border-[var(--cp-accent-primary)] hover:bg-[var(--cp-bg-subtle)]'
                    }`}
                  >
                    {source === 'google_drive' && 'Google Drive'}
                    {source === 'youtube' && 'YouTube'}
                    {source === 'upload' && 'Direct upload / other'}
                  </button>
                ))}
              </div>
              <Input
                value={introUrl}
                onChange={(e) => setIntroUrl(e.target.value)}
                placeholder="Paste a share link or embed URL"
                className="mt-2 bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">
                We&apos;ll use this as the intro video in the portal hero. For Google Drive, paste a share URL;
                existing automations can keep your library in sync.
              </p>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message === 'Saved.' ? 'text-[var(--cp-accent-success)]' : 'text-[var(--cp-accent-danger)]'
                }`}
              >
                {message}
              </p>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save portal appearance'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

