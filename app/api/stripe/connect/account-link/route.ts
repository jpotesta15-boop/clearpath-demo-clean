import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY is not set; Stripe Connect will fail.')
}

export async function POST(request: Request) {
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin

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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, stripe_connect_account_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.role !== 'coach') {
    return NextResponse.json({ error: 'Only coaches can connect Stripe' }, { status: 403 })
  }

  const stripe = new Stripe(stripeSecret)
  const returnUrl = `${origin}/coach/dashboard`
  const refreshUrl = `${origin}/coach/dashboard`

  let accountId = profile.stripe_connect_account_id

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email ?? undefined,
      })
      accountId = account.id
      const supabaseAdmin = createServiceClient()
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({
          stripe_connect_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateErr) {
        console.error('Failed to save stripe_connect_account_id', updateErr)
        return NextResponse.json({ error: 'Failed to save Connect account. Please try again.' }, { status: 500 })
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    if (!accountLink?.url) {
      return NextResponse.json({ error: 'Could not create Stripe link. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error('[stripe-connect] account-link error:', err)
    return NextResponse.json(
      { error: 'Stripe is temporarily unavailable. Please try again in a moment.' },
      { status: 502 }
    )
  }
}
