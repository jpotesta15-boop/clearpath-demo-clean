'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { FormField, FormLabel, FormError } from '@/components/ui/form'
import { getSafeAuthMessage } from '@/lib/safe-messages'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    const hasHash = typeof window !== 'undefined' && window.location.hash?.length > 0
    async function check() {
      let session = (await supabase.auth.getSession()).data.session
      if (session) {
        if (!cancelled) setReady(true)
        if (!cancelled) setLoading(false)
        return
      }
      if (!hasHash) {
        if (!cancelled) router.replace('/login')
        if (!cancelled) setLoading(false)
        return
      }
      await new Promise((r) => setTimeout(r, 300))
      if (cancelled) return
      session = (await supabase.auth.getSession()).data.session
      if (!cancelled) {
        setReady(true)
        setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [router, supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      setError(getSafeAuthMessage('set-password'))
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'coach') {
        router.replace('/coach/dashboard')
      } else {
        router.replace('/client/dashboard')
      }
    } else {
      router.replace('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--cp-bg-page)]">
        <div className="text-[var(--cp-text-muted)]">Loading…</div>
      </div>
    )
  }

  if (!ready) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)] flex items-stretch">
      <AppLayout className="flex items-stretch gap-0 lg:gap-12">
        <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_var(--cp-accent-primary)_0,_transparent_55%),_radial-gradient(circle_at_bottom,_var(--cp-accent-success)_0,_transparent_55%)]" />
          <div className="relative max-w-md w-full">
            <h1 className="text-3xl font-semibold tracking-tight mb-4 text-[var(--cp-text-primary)]">Set your password</h1>
            <p className="text-sm text-[var(--cp-text-muted)]">
              Choose a secure password to sign in to your account.
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--cp-bg-elevated)] border border-[var(--cp-border-subtle)] rounded-2xl shadow-[var(--cp-shadow-card)] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--cp-text-primary)]">Set your password</h2>
              <p className="mt-2 text-sm text-[var(--cp-text-muted)]">Enter a new password below.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormField>
                <FormLabel htmlFor="password" className="text-[var(--cp-text-muted)]">New password</FormLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="mt-1"
                  placeholder="••••••••"
                />
              </FormField>
              <FormField>
                <FormLabel htmlFor="confirm" className="text-[var(--cp-text-muted)]">Confirm password</FormLabel>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="mt-1"
                  placeholder="••••••••"
                />
              </FormField>
              {error && <FormError>{error}</FormError>}
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Set password'}
              </Button>
            </form>
            <p className="mt-4 text-center">
              <a href="/login" className="text-sm text-[var(--cp-accent-primary)] hover:underline">Back to login</a>
            </p>
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
