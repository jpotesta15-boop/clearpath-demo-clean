import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  console.warn('STRIPE_SECRET_KEY is not set; Stripe checkout will fail.')
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const sessionRequestId = typeof body.session_request_id === 'string' ? body.session_request_id.trim() : null
  if (!sessionRequestId) {
    return NextResponse.json({ error: 'session_request_id is required' }, { status: 400 })
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

  const supabaseAdmin = createServiceClient()
  const { data: sessionRequest, error: reqError } = await supabaseAdmin
    .from('session_requests')
    .select('id, coach_id, client_id, amount_cents, status, session_products(name)')
    .eq('id', sessionRequestId)
    .single()

  if (reqError || !sessionRequest) {
    return NextResponse.json({ error: 'Session request not found' }, { status: 404 })
  }

  if (sessionRequest.status !== 'offered' && sessionRequest.status !== 'accepted') {
    return NextResponse.json({ error: 'Request is not available for payment' }, { status: 400 })
  }

  const { data: coachProfile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', sessionRequest.coach_id)
    .single()

  const coachAccountId = coachProfile?.stripe_connect_account_id
  if (!coachAccountId) {
    return NextResponse.json(
      { error: 'Coach has not connected Stripe yet; they need to connect in the coach dashboard.' },
      { status: 400 }
    )
  }

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, email')
    .eq('id', sessionRequest.client_id)
    .single()

  if (!client || client.email !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  const stripe = new Stripe(stripeSecret)

  const sessionParams = {
    mode: 'payment' as const,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: (sessionRequest.session_products as { name?: string } | null)?.name ?? 'Session',
            description: 'One coaching session',
          },
          unit_amount: sessionRequest.amount_cents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      session_request_id: sessionRequestId,
    },
    success_url: `${origin}/client/schedule?paid=1&session_request_id=${sessionRequestId}`,
    cancel_url: `${origin}/client/schedule?cancelled=1`,
    client_reference_id: sessionRequestId,
  }

  const session = await stripe.checkout.sessions.create(sessionParams, {
    stripeAccount: coachAccountId,
  })

  await supabaseAdmin
    .from('session_requests')
    .update({ status: 'payment_pending', updated_at: new Date().toISOString() })
    .eq('id', sessionRequestId)

  return NextResponse.json({ url: session.url })
}
