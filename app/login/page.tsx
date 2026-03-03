'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'auth') {
      setLoginError('Sign-in failed. Please try again.')
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
    <div className="min-h-screen flex items-stretch bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800 text-slate-50">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_#38bdf8_0,_transparent_55%),_radial-gradient(circle_at_bottom,_#22c55e_0,_transparent_55%)]" />
        <div className="relative max-w-md w-full px-8">
          <h1 className="text-3xl font-semibold tracking-tight mb-4">ClearPath Coach OS</h1>
          <p className="text-sm text-slate-200/80 mb-6">
            Run your coaching business in one place: programs, videos, messaging, and payments.
          </p>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-700/60 shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300/80">
              <span>Today&apos;s sessions</span>
              <span className="text-emerald-400 font-medium">+3 scheduled</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400">
              Log in as a coach or client to see your personalized dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-10 lg:px-12 bg-slate-950/80">
        <div className="w-full max-w-md bg-slate-900/70 border border-slate-800/80 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-50 text-center">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-400 text-center">Sign in to your coach or client portal.</p>
          </div>
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-0.5 bg-slate-900/60 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:ring-sky-400"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-0.5 bg-slate-900/60 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:border-sky-400 focus:ring-sky-400"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {loginError && (
              <p className="text-sm text-rose-400" role="alert">
                {loginError}
              </p>
            )}
            <Button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-700/70" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-slate-900/70 px-2 text-slate-500">Or continue with</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800"
              disabled={loading}
              onClick={handleGoogleSignIn}
            >
              Sign in with Google
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="max-w-md w-full p-8 bg-slate-900/70 rounded-lg shadow text-center text-slate-300">
            Loading…
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}

