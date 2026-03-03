import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientId } from '@/lib/config'

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

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

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
      const msg = error.message.toLowerCase()
      const userFriendly =
        msg.includes('already') || msg.includes('registered')
          ? 'This email already has an account.'
          : error.message
      return NextResponse.json({ error: userFriendly }, { status: 400 })
    }
    if (!data?.user) {
      return NextResponse.json({ error: 'User could not be created' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, password })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

