'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GENERIC_FAILED } from '@/lib/safe-messages'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import Link from 'next/link'

const PORTAL_SECTIONS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'messages', label: 'Messages' },
  { id: 'programs', label: 'Programs' },
  { id: 'videos', label: 'Videos' },
  { id: 'payments', label: 'Payments' },
] as const

export default function BrandingSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [brandName, setBrandName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0ea5e9')
  const [accentColor, setAccentColor] = useState('#0ea5e9')
  const [backgroundColor, setBackgroundColor] = useState('')
  const [whiteLabel, setWhiteLabel] = useState(false)

  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [emailLogoUrl, setEmailLogoUrl] = useState('')
  const [footerText, setFooterText] = useState('')

  const [customDomain, setCustomDomain] = useState('')
  const [domainStatus, setDomainStatus] = useState<string | null>(null)
  const [verificationToken, setVerificationToken] = useState('')

  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [portalNavEnabled, setPortalNavEnabled] = useState<string[]>(['schedule', 'messages', 'programs', 'videos', 'payments'])

  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, display_name, full_name, logo_url')
        .eq('id', user.id)
        .single()

      if (!profile || profile.tenant_id == null) {
        setLoading(false)
        return
      }

      const tenantId = profile.tenant_id

      const [brandRes, emailRes, domainsRes, experienceRes] = await Promise.all([
        supabase.from('coach_brand_settings').select('*').eq('coach_id', user.id).maybeSingle(),
        supabase.from('coach_email_settings').select('*').eq('coach_id', user.id).maybeSingle(),
        supabase.from('coach_domains').select('domain, status, verification_token').eq('coach_id', user.id).order('requested_at', { ascending: false }).limit(1),
        supabase.from('coach_client_experience').select('welcome_body, portal_nav_enabled').eq('coach_id', user.id).eq('tenant_id', tenantId).maybeSingle(),
      ])

      const brand = brandRes.data as any
      const email = emailRes.data as any
      const domainRow = domainsRes.data?.[0] as any
      const experience = experienceRes.data as any

      if (brand) {
        setBrandName(brand.brand_name ?? '')
        setLogoUrl(brand.logo_url ?? profile?.logo_url ?? '')
        setFaviconUrl(brand.favicon_url ?? brand.app_icon_url ?? '')
        setPrimaryColor(brand.primary_color ?? '#0ea5e9')
        setAccentColor(brand.accent_color ?? brand.primary_color ?? '#0ea5e9')
        setBackgroundColor(brand.background_color ?? '')
        setWhiteLabel(brand.white_label === true)
      } else {
        setBrandName(profile?.display_name ?? profile?.full_name ?? '')
        setLogoUrl(profile?.logo_url ?? '')
      }

      if (email) {
        setSenderName(email.sender_name ?? '')
        setSenderEmail(email.sender_email ?? '')
        setEmailLogoUrl(email.email_logo_url ?? '')
        setFooterText(email.footer_text ?? '')
      }

      if (domainRow) {
        setCustomDomain(domainRow.domain ?? '')
        setDomainStatus(domainRow.status ?? null)
        setVerificationToken(domainRow.verification_token ?? '')
      }

      if (experience) {
        setWelcomeMessage(experience.welcome_body ?? '')
        setPortalNavEnabled(Array.isArray(experience.portal_nav_enabled) ? experience.portal_nav_enabled : [...PORTAL_SECTIONS].map((s) => s.id))
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      setLogoError('Please choose an image.')
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
    const path = `${user.id}/brand-logo.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    setLogoUploading(false)
    if (error) {
      setLogoError(GENERIC_FAILED)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setLogoUrl(publicUrl)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
    const tenantId = profile?.tenant_id ?? 'default'

    setSaving(true)
    setMessage(null)

    const brandPayload = {
      coach_id: user.id,
      tenant_id: tenantId,
      brand_name: brandName.trim() || null,
      logo_url: logoUrl.trim() || null,
      favicon_url: faviconUrl.trim() || null,
      primary_color: primaryColor.trim() || null,
      secondary_color: accentColor.trim() || null,
      accent_color: accentColor.trim() || null,
      background_color: backgroundColor.trim() || null,
      white_label: whiteLabel,
      updated_at: new Date().toISOString(),
    }

    const emailPayload = {
      coach_id: user.id,
      tenant_id: tenantId,
      sender_name: senderName.trim() || null,
      sender_email: senderEmail.trim() || null,
      email_logo_url: emailLogoUrl.trim() || null,
      footer_text: footerText.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const [brandErr, emailErr] = await Promise.all([
      supabase.from('coach_brand_settings').upsert(brandPayload, { onConflict: 'coach_id' }),
      supabase.from('coach_email_settings').upsert(emailPayload, { onConflict: 'coach_id' }),
    ])

    const experiencePayload = {
      coach_id: user.id,
      tenant_id: tenantId,
      welcome_body: welcomeMessage.trim() || null,
      portal_nav_enabled: portalNavEnabled,
      updated_at: new Date().toISOString(),
    }
    const experienceErr = await supabase
      .from('coach_client_experience')
      .upsert(experiencePayload, { onConflict: 'coach_id' })

    setSaving(false)
    if (brandErr.error || emailErr.error || experienceErr.error) {
      setMessage(GENERIC_FAILED)
    } else {
      setMessage('Saved.')
    }
  }

  const togglePortalSection = (id: string) => {
    setPortalNavEnabled((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  if (loading) return <PageSkeleton cardCount={3} />

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Branding"
        subtitle="White-label the platform with your logo, colors, and custom domain. These settings affect your dashboard and client portal."
        primaryAction={
          <Button variant="outline" size="sm" asChild>
            <Link href="/coach/settings">Back to Settings</Link>
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-8">
        <Card variant="raised">
          <CardHeader>
            <CardTitle>Logo & identity</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)]">
              Brand name and logo appear in the sidebar, client portal, and login.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Brand / organization name</label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Acme Coaching"
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Logo</label>
              <div className="flex flex-wrap items-center gap-3">
                {logoUrl && (
                  <img src={logoUrl} alt="" className="h-14 w-14 rounded-lg border border-[var(--cp-border-subtle)] object-contain" />
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="text-sm text-[var(--cp-text-primary)] file:mr-2 file:rounded-md file:border-0 file:bg-[var(--cp-accent-primary-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--cp-accent-primary)]"
                />
                {logoUploading && <span className="text-xs text-[var(--cp-text-muted)]">Uploading…</span>}
                {logoError && <span className="text-xs text-[var(--cp-accent-danger)]">{logoError}</span>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Favicon URL (optional)</label>
              <Input
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://…"
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">Used in browser tab for client portal.</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardHeader>
            <CardTitle>Colors</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)]">
              Primary and accent colors drive buttons, links, and highlights.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Primary color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 rounded border border-[var(--cp-border-subtle)] cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-28 bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Accent color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-14 rounded border border-[var(--cp-border-subtle)] cursor-pointer"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-28 bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] font-mono text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Background (optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor || '#020617'}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-10 w-14 rounded border border-[var(--cp-border-subtle)] cursor-pointer"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="#020617"
                    className="w-28 bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)] font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="white_label"
                checked={whiteLabel}
                onChange={(e) => setWhiteLabel(e.target.checked)}
                className="rounded border-[var(--cp-border-subtle)]"
              />
              <label htmlFor="white_label" className="text-sm text-[var(--cp-text-primary)]">
                White-label mode: hide platform branding (e.g. “Powered by”)
              </label>
            </div>
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardHeader>
            <CardTitle>Custom domain</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)]">
              Use your own domain for the client portal (e.g. portal.yourstudio.com). Domain verification and SSL are required.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {customDomain ? (
              <>
                <p className="text-sm text-[var(--cp-text-primary)]">
                  <strong>Domain:</strong> {customDomain}
                  {domainStatus && (
                    <span className="ml-2 text-[var(--cp-text-muted)]">({domainStatus})</span>
                  )}
                </p>
                <p className="text-xs text-[var(--cp-text-muted)]">
                  Add a DNS TXT record: <code className="rounded bg-[var(--cp-bg-subtle)] px-1">{verificationToken || '—'}</code>
                </p>
                <p className="text-xs text-[var(--cp-text-muted)]">
                  After verification, point your domain CNAME to this app. SSL is provisioned automatically when the domain is active.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--cp-text-muted)]">
                Custom domain support is configured at the platform level. Contact support to add a custom domain and receive DNS instructions.
              </p>
            )}
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardHeader>
            <CardTitle>Email branding</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)]">
              Sender name, logo, and footer for emails sent to clients.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Sender name</label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Acme Coaching"
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Sender email</label>
              <Input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Email logo URL</label>
              <Input
                value={emailLogoUrl}
                onChange={(e) => setEmailLogoUrl(e.target.value)}
                placeholder="https://…"
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Footer text</label>
              <Textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Optional footer for emails"
                rows={2}
                className="max-w-md bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="raised">
          <CardHeader>
            <CardTitle>Client portal</CardTitle>
            <p className="text-sm font-normal text-[var(--cp-text-muted)]">
              Welcome message and which sections appear in the client nav.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-1">Welcome message (short)</label>
              <Textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Brief welcome or booking instructions."
                rows={2}
                className="bg-[var(--cp-bg-surface)] border-[var(--cp-border-subtle)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--cp-text-primary)] mb-2">Show in client portal nav</label>
              <div className="flex flex-wrap gap-2">
                {PORTAL_SECTIONS.map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={portalNavEnabled.includes(id)}
                      onChange={() => togglePortalSection(id)}
                      className="rounded border-[var(--cp-border-subtle)]"
                    />
                    <span className="text-sm text-[var(--cp-text-primary)]">{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--cp-text-muted)] mt-1">Disable sections you do not use so clients see a simpler menu.</p>
            </div>
          </CardContent>
        </Card>

        {message && (
          <p className={`text-sm ${message === 'Saved.' ? 'text-[var(--cp-accent-success)]' : 'text-[var(--cp-accent-danger)]'}`}>
            {message}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save branding'}
        </Button>
      </form>
    </div>
  )
}
