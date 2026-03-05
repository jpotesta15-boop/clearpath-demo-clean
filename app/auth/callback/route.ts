import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  const id = getClientIdentifier(request)
  const { allowed } = checkRateLimit(`auth-callback:${id}`, { windowMs: 60_000, max: 15 })
  if (!allowed) {
    return NextResponse.redirect(new URL('/login?error=rate_limit', requestUrl.origin), { status: 429 })
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // ignore in Route Handler
            }
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).single()
        : { data: null }
      const redirectTo = profile?.role === 'coach' ? '/coach/dashboard' : profile?.role === 'client' ? '/client/dashboard' : next
      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', requestUrl.origin))
}
