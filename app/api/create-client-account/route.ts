import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientId } from '@/lib/config'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { createClientAccountSchema } from '@/lib/validations'
import { getSafeMessage, logServerError } from '@/lib/api-error'

function generatePassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
  let pw = ''
  while (pw.length < length) {
    const idx = Math.floor(Math.random() * alphabet.length)
    pw += alphabet[idx]
  }
  return pw
}

export async function POST(request: Request) {
  const id = getClientIdentifier(request)
  const { allowed } = checkRateLimit(`create-client:${id}`, { windowMs: 60_000, max: 20 })
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
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
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

  const parsed = createClientAccountSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors.email?.[0] ?? parsed.error.message
    return NextResponse.json({ error: first }, { status: 400 })
  }
  const { email } = parsed.data
  const tenantId = getClientId()

  try {
    const admin = createServiceClient()
    const password = generatePassword()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        tenant_id: tenantId,
        role: 'client',
      },
    })
    if (error) {
      logServerError('create-client-account', error, { email: email.slice(0, 3) + '…' })
      const msg = error.message.toLowerCase()
      const userFriendly =
        msg.includes('already') || msg.includes('registered')
          ? 'This email already has an account.'
          : getSafeMessage(400)
      return NextResponse.json({ error: userFriendly }, { status: 400 })
    }
    if (!data?.user) {
      return NextResponse.json({ error: 'User could not be created' }, { status: 500 })
    }
    const maxRetries = 3
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { error: updateError } = await admin
        .from('profiles')
        .update({ tenant_id: tenantId })
        .eq('id', data.user.id)
      if (!updateError) {
        return NextResponse.json({ ok: true, password })
      }
      logServerError('create-client-account', updateError, { attempt, userId: data.user.id })
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 300 * attempt))
      }
    }
    const { error: deleteErr } = await admin.auth.admin.deleteUser(data.user.id)
    if (deleteErr) {
      logServerError('create-client-account', deleteErr, { context: 'rollback delete user', userId: data.user.id })
    }
    return NextResponse.json(
      { error: 'Account could not be set up. Please try again or contact support.' },
      { status: 500 }
    )
  } catch (err) {
    logServerError('create-client-account', err)
    return NextResponse.json({ error: getSafeMessage(500) }, { status: 500 })
  }
}

