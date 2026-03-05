import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientId } from '@/lib/config'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { inviteClientSchema } from '@/lib/validations'
import { getSafeMessage, logServerError } from '@/lib/api-error'

export async function POST(request: Request) {
  const id = getClientIdentifier(request)
  const { allowed } = checkRateLimit(`invite-client:${id}`, { windowMs: 60_000, max: 20 })
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = inviteClientSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors.email?.[0] ?? parsed.error.message
    return NextResponse.json({ error: first }, { status: 400 })
  }
  const { email } = parsed.data
  const tenantId = getClientId()

  try {
    const admin = createServiceClient()
    const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: tenantId,
        role: 'client',
      },
      redirectTo: `${new URL(request.url).origin}/auth/set-password`,
    })
    if (error) {
      logServerError('invite-client', error, { email: email.slice(0, 3) + '…' })
      const msg = error.message.toLowerCase()
      const userFriendly =
        msg.includes('already') || msg.includes('registered')
          ? 'This email already has an account.'
          : msg.includes('email') || msg.includes('invite') || msg.includes('send')
            ? 'Invite could not be sent. Check your email configuration.'
            : getSafeMessage(400)
      return NextResponse.json({ error: userFriendly }, { status: 400 })
    }
    return NextResponse.json({ ok: true, user: inviteData?.user?.id })
  } catch (err) {
    logServerError('invite-client', err)
    return NextResponse.json({ error: getSafeMessage(500) }, { status: 500 })
  }
}
