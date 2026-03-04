'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ClientPortalAccessProps {
  clientEmail: string | null
}

export function ClientPortalAccess({ clientEmail }: ClientPortalAccessProps) {
  const [inviteLoading, setInviteLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const clearFeedback = () => {
    setError(null)
    setInviteSuccess(false)
    setCreateSuccess(false)
    setGeneratedPassword(null)
    setCopied(false)
  }

  const handleSendInvite = async () => {
    if (!clientEmail) return
    setInviteLoading(true)
    clearFeedback()
    try {
      const res = await fetch('/api/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.error ?? 'Invite failed'
        if (msg.toLowerCase().includes('already') && msg.toLowerCase().includes('account')) {
          setError('User already has an account. They can use Forgot password on the login page.')
        } else {
          setError(msg)
        }
        return
      }
      setInviteSuccess(true)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCreateLogin = async () => {
    if (!clientEmail) return
    setCreateLoading(true)
    clearFeedback()
    try {
      const res = await fetch('/api/create-client-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.error ?? 'Create login failed'
        if (msg.toLowerCase().includes('already') && msg.toLowerCase().includes('account')) {
          setError('User already has an account. Try Send invite instead.')
        } else {
          setError(msg)
        }
        return
      }
      setGeneratedPassword(data.password ?? null)
      setCreateSuccess(true)
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setCreateLoading(false)
    }
  }

  const copyPassword = async () => {
    if (!generatedPassword) return
    try {
      await navigator.clipboard.writeText(generatedPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard.')
    }
  }

  if (clientEmail === undefined) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client portal access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!clientEmail || clientEmail.trim() === '' ? (
          <p className="text-sm text-[var(--cp-text-muted)]">
            Add email in Contact Information (or edit client) to enable portal login.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--cp-text-muted)]">
              Let this client sign in to the client portal. Send an invite email or create a login and share the password.
            </p>
            {error && (
              <p className="text-sm text-[var(--cp-accent-danger)]" role="alert">
                {error}
              </p>
            )}
            {inviteSuccess && (
              <p className="text-sm text-[var(--cp-accent-success)]" role="status">
                Invite sent.
              </p>
            )}
            {createSuccess && generatedPassword && (
              <div className="rounded-md bg-[var(--cp-bg-subtle)] border border-[var(--cp-border-subtle)] p-3 space-y-2">
                <p className="text-sm text-[var(--cp-accent-success)]" role="status">
                  Login created. Share this password with the client (shown once):
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-[var(--cp-bg-page)] px-2 py-1.5 rounded border border-[var(--cp-border-subtle)] break-all">
                    {generatedPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyPassword}
                    className="shrink-0"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
            <p className="text-xs text-[var(--cp-text-muted)]">
              Share the invite link so the client can open the login page with their email pre-filled.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : ''
                  const url = `${origin}/login?email=${encodeURIComponent(clientEmail)}`
                  navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {})
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? 'Copied' : 'Copy invite link'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendInvite}
                disabled={inviteLoading || createLoading}
              >
                {inviteLoading ? 'Sending…' : 'Send invite'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateLogin}
                disabled={inviteLoading || createLoading}
              >
                {createLoading ? 'Creating…' : 'Create login / Generate password'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
