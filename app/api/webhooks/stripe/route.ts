import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  if (!stripeSecret || !webhookSecret) {
    console.error('Stripe webhook: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = new Stripe(stripeSecret)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Stripe webhook signature verification failed:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const sessionRequestId = session.metadata?.session_request_id ?? session.client_reference_id
  if (!sessionRequestId) {
    console.error('Stripe webhook: no session_request_id in metadata')
    return NextResponse.json({ error: 'Missing session_request_id' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: sessionRequest, error: fetchErr } = await supabase
    .from('session_requests')
    .select('id, coach_id, client_id, amount_cents, tenant_id, session_products(name)')
    .eq('id', sessionRequestId)
    .single()

  if (fetchErr || !sessionRequest) {
    console.error('Stripe webhook: session_request not found', sessionRequestId, fetchErr)
    return NextResponse.json({ error: 'Session request not found' }, { status: 404 })
  }

  const description = (sessionRequest.session_products as any)?.name ?? 'Session'

  const { error: paymentInsertErr } = await supabase.from('payments').insert({
    coach_id: sessionRequest.coach_id,
    client_id: sessionRequest.tenant_id,
    session_request_id: sessionRequestId,
    amount_cents: sessionRequest.amount_cents,
    currency: 'usd',
    status: 'succeeded',
    provider: 'stripe',
    stripe_payment_intent_id: session.payment_intent as string ?? null,
    payer_client_id: sessionRequest.client_id,
    description,
  })

  if (paymentInsertErr) {
    console.error('Stripe webhook: failed to insert payment', paymentInsertErr)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  const { error: updateErr } = await supabase
    .from('session_requests')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', sessionRequestId)

  if (updateErr) {
    console.error('Stripe webhook: failed to update session_request', updateErr)
  }

  return NextResponse.json({ received: true })
}
