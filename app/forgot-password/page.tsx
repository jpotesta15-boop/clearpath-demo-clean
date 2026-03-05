'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { FormField, FormLabel, FormError } from '@/components/ui/form'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    setSent(false)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/set-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)] flex items-stretch">
      <AppLayout className="flex items-stretch gap-0 lg:gap-12">
        <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_var(--cp-accent-primary)_0,_transparent_55%)]" />
          <div className="relative max-w-md w-full">
            <h1 className="text-3xl font-semibold tracking-tight mb-4 text-[var(--cp-text-primary)]">Reset password</h1>
            <p className="text-sm text-[var(--cp-text-muted)]">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--cp-bg-elevated)] border border-[var(--cp-border-subtle)] rounded-2xl shadow-[var(--cp-shadow-card)] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--cp-text-primary)]">Forgot password?</h2>
              <p className="mt-2 text-sm text-[var(--cp-text-muted)]">Enter your email to receive a reset link.</p>
            </div>
            {sent ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--cp-accent-success)]">
                  Check your email for a link to set a new password.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Back to login</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <FormField>
                  <FormLabel htmlFor="email" className="text-[var(--cp-text-muted)]">Email</FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="mt-1"
                    placeholder="you@example.com"
                  />
                </FormField>
                {error && <FormError>{error}</FormError>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            )}
            <p className="mt-4 text-center">
              <Link href="/login" className="text-sm text-[var(--cp-accent-primary)] hover:underline">Back to login</Link>
            </p>
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
