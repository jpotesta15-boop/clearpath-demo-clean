import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const loginRateLimit = new Map<string, number[]>()
const LOGIN_WINDOW_MS = 60_000
const LOGIN_MAX = 30

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now()
  const timestamps = loginRateLimit.get(ip) ?? []
  const cutoff = now - LOGIN_WINDOW_MS
  const kept = timestamps.filter((t) => t > cutoff)
  if (kept.length >= LOGIN_MAX) return false
  kept.push(now)
  loginRateLimit.set(ip, kept)
  return true
}

function getIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown'
}

const allowedOrigins = (process.env.NEXT_PUBLIC_APP_URL || '').split(',').map((o) => o.trim()).filter(Boolean)

function getCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  if (allowedOrigins.length > 0) return allowedOrigins.includes(origin) ? origin : null
  const appOrigin = request.nextUrl.origin
  return origin === appOrigin ? origin : null
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/api/')) {
    const corsOrigin = getCorsOrigin(request)
    if (corsOrigin) {
      response.headers.set('Access-Control-Allow-Origin', corsOrigin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
    return response
  }

  if (pathname === '/login' || pathname === '/forgot-password') {
    const ip = getIp(request)
    if (!checkLoginRateLimit(ip)) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect coach and client routes: require auth
  if (pathname.startsWith('/coach') || pathname.startsWith('/client')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Optional: redirect authenticated users from / to role-based dashboard
  if (pathname === '/' && session) {
    // We don't have role in middleware without an extra request; redirect to login page
    // which will then redirect to dashboard. Or we could redirect to a generic /dashboard
    // that redirects by role. Keep it simple: redirect to /coach/dashboard and let
    // the app redirect clients from there if needed. Better: redirect to /login?redirect=
    // and let callback handle it. Simplest: do nothing for / so they see landing.
    // Plan said "optionally redirect / to role-based dashboard" - we need role.
    // Skip redirect for / to avoid extra DB call in middleware; layouts can handle.
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/coach/:path*',
    '/client/:path*',
    '/login',
    '/forgot-password',
  ],
}
