'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { FormField, FormLabel, FormError } from '@/components/ui/form'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'auth') {
      setLoginError('Sign-in failed. Please try again.')
    }
    const emailParam = searchParams.get('email')
    if (emailParam && typeof emailParam === 'string') {
      try {
        setEmail(decodeURIComponent(emailParam))
      } catch {
        setEmail(emailParam)
      }
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setLoginError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })
    if (error) {
      setLoginError(error.message)
    }
    setLoading(false)
  }

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setLoginError('Enter your email above, then click Forgot password.')
      return
    }
    setLoading(true)
    setLoginError(null)
    setForgotSent(false)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/set-password`,
    })
    if (error) {
      setLoginError(error.message)
    } else {
      setForgotSent(true)
    }
    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role === 'coach') {
        router.push('/coach/dashboard')
      } else {
        router.push('/client/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)] flex items-stretch">
      <AppLayout className="flex items-stretch gap-0 lg:gap-12">
        <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_var(--cp-accent-primary)_0,_transparent_55%),_radial-gradient(circle_at_bottom,_var(--cp-accent-success)_0,_transparent_55%)]" />
          <div className="relative max-w-md w-full">
            <h1 className="text-3xl font-semibold tracking-tight mb-4 text-[var(--cp-text-primary)]">ClearPath Coach OS</h1>
            <p className="text-sm text-[var(--cp-text-muted)] mb-6">
              Run your coaching business in one place: programs, videos, messaging, and payments.
            </p>
            <div className="rounded-2xl bg-[var(--cp-bg-elevated)] border border-[var(--cp-border-subtle)] shadow-[var(--cp-shadow-card)] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--cp-text-muted)]">
                <span>Today&apos;s sessions</span>
                <span className="text-[var(--cp-accent-success)] font-medium">+3 scheduled</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--cp-border-subtle)] overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[var(--cp-accent-primary)] to-[var(--cp-accent-success)]" />
              </div>
              <p className="text-[11px] text-[var(--cp-text-subtle)]">
                Log in as a coach or client to see your personalized dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--cp-bg-elevated)] border border-[var(--cp-border-subtle)] rounded-2xl shadow-[var(--cp-shadow-card)] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--cp-text-primary)]">Welcome back</h2>
              <p className="mt-2 text-sm text-[var(--cp-text-muted)]">Sign in to your coach or client portal.</p>
            </div>
            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="email" className="text-[var(--cp-text-muted)]">
                    Email
                  </FormLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="mt-1 bg-[var(--cp-bg-page)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-subtle)] focus:border-[var(--cp-border-focus)] focus:ring-[var(--cp-border-focus)]"
                    placeholder="you@example.com"
                  />
                </FormField>
                <FormField>
                  <div className="flex items-center justify-between">
                    <FormLabel htmlFor="password" className="text-[var(--cp-text-muted)]">
                      Password
                    </FormLabel>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      className="text-xs text-[var(--cp-accent-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cp-bg-elevated)] rounded"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="mt-1 bg-[var(--cp-bg-page)] border-[var(--cp-border-subtle)] text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-subtle)] focus:border-[var(--cp-border-focus)] focus:ring-[var(--cp-border-focus)]"
                    placeholder="••••••••"
                  />
                </FormField>
              </div>
              {forgotSent && (
                <p className="text-sm text-[var(--cp-accent-success)]" role="status">
                  Check your email for a link to reset your password.
                </p>
              )}
              {loginError && <FormError>{loginError}</FormError>}
              <Button
                type="submit"
                className="w-full font-semibold bg-[var(--cp-accent-primary)] text-[var(--cp-text-on-accent)] hover:bg-[var(--cp-accent-primary-strong)] focus-visible:ring-[var(--cp-border-focus)]"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--cp-border-subtle)]" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-[var(--cp-bg-elevated)] px-2 text-[var(--cp-text-subtle)]">Or continue with</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-[var(--cp-border-subtle)] bg-[var(--cp-bg-page)] text-[var(--cp-text-primary)] hover:bg-[var(--cp-bg-subtle)] focus-visible:ring-[var(--cp-border-focus)]"
                disabled={loading}
                onClick={handleGoogleSignIn}
              >
                Sign in with Google
              </Button>
            </form>
            <div className="mt-6 pt-4 border-t border-[var(--cp-border-subtle)]">
              <button
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                className="text-xs text-[var(--cp-text-subtle)] hover:text-[var(--cp-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cp-border-focus)] rounded"
              >
                {showDemo ? 'Hide demo credentials' : 'Demo credentials'}
              </button>
              {showDemo && (
                <p className="mt-2 text-xs text-[var(--cp-text-muted)] font-mono">
                  coach@demo.com / demo123
                </p>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--cp-bg-page)]">
          <div className="max-w-md w-full p-8 bg-[var(--cp-bg-elevated)] rounded-lg shadow-[var(--cp-shadow-card)] text-center text-[var(--cp-text-muted)]">
            Loading…
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

