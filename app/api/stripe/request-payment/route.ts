/**
 * Coach creates a payment link for a client's balance owed.
 * Returns Stripe Checkout URL. Metadata: type=balance, session_request_ids.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import Stripe from 'stripe'
import { z } from 'zod'
import { getClientId } from '@/lib/config'

const stripeSecret = process.env.STRIPE_SECRET_KEY

const schema = z.object({
  client_id: z.string().uuid(),
})

export async function POST(request: Request) {
  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }
  const { client_id: clientId } = parsed.data

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
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createServiceClient()
  const tenantId = getClientId()

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, coach_id, email')
    .eq('id', clientId)
    .single()

  if (!client || client.coach_id !== user.id) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const { data: unpaidRequests } = await supabaseAdmin
    .from('session_requests')
    .select('id, amount_cents, coach_id, tenant_id, session_products(name)')
    .eq('client_id', clientId)
    .in('status', ['offered', 'accepted', 'payment_pending'])

  if (!unpaidRequests || unpaidRequests.length === 0) {
    return NextResponse.json({ error: 'No balance owed' }, { status: 400 })
  }

  const totalCents = unpaidRequests.reduce((s, r) => s + (r.amount_cents ?? 0), 0)
  const coachId = unpaidRequests[0].coach_id
  const reqTenantId = unpaidRequests[0].tenant_id ?? tenantId
  const productName = (unpaidRequests[0].session_products as { name?: string } | null)?.name ?? 'Session'

  const { data: coachProfile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', coachId)
    .single()

  const coachAccountId = coachProfile?.stripe_connect_account_id
  if (!coachAccountId) {
    return NextResponse.json(
      { error: 'Connect Stripe in your dashboard first' },
      { status: 400 }
    )
  }

  const origin = new URL(request.url).origin
  const stripe = new Stripe(stripeSecret)
  const sessionRequestIds = unpaidRequests.map((r) => r.id).join(',')

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Balance – ${productName}`,
              description:
                unpaidRequests.length > 1
                  ? `${unpaidRequests.length} session offers`
                  : 'One coaching session',
            },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'balance',
        client_id: clientId,
        coach_id: coachId,
        session_request_ids: sessionRequestIds,
        tenant_id: reqTenantId,
      },
      success_url: `${origin}/client/schedule?paid=1`,
      cancel_url: `${origin}/client/schedule?cancelled=1`,
    },
    { stripeAccount: coachAccountId }
  )

  return NextResponse.json({ url: session.url })
}
