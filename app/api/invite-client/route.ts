import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getClientId } from '@/lib/config'

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

  let body: { email: string }
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
    const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        tenant_id: tenantId,
        role: 'client',
      },
      redirectTo: `${new URL(request.url).origin}/auth/set-password`,
    })
    if (error) {
      const msg = error.message.toLowerCase()
      const userFriendly =
        msg.includes('already') || msg.includes('registered')
          ? 'This email already has an account.'
          : msg.includes('email') || msg.includes('invite') || msg.includes('send')
            ? 'Invite could not be sent. Check Supabase email settings (Authentication → Email / SMTP).'
            : error.message
      return NextResponse.json({ error: userFriendly }, { status: 400 })
    }
    return NextResponse.json({ ok: true, user: inviteData?.user?.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invite failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
