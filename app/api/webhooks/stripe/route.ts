import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSafeMessage, logServerError } from '@/lib/api-error'
import { validateStripeEnv } from '@/lib/env'
import Stripe from 'stripe'

export async function POST(request: Request) {
  const envCheck = validateStripeEnv()
  if (!envCheck.ok) {
    console.error('Stripe webhook: missing env', envCheck.missing)
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }
  const stripeSecret = process.env.STRIPE_SECRET_KEY!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

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
    logServerError('stripe-webhook', err, { context: 'signature verification' })
    return NextResponse.json({ error: getSafeMessage(400) }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const supabase = createServiceClient()
  const { error: idemErr } = await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    processed_at: new Date().toISOString(),
  })
  if (idemErr) {
    if (idemErr.code === '23505') {
      return NextResponse.json({ received: true })
    }
    logServerError('stripe-webhook', idemErr, { context: 'idempotency insert' })
    return NextResponse.json({ error: getSafeMessage(500) }, { status: 500 })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const sessionRequestId = session.metadata?.session_request_id ?? session.client_reference_id
  if (!sessionRequestId) {
    logServerError('stripe-webhook', new Error('no session_request_id in metadata'))
    return NextResponse.json({ error: 'Missing session_request_id' }, { status: 400 })
  }

  const { data: sessionRequest, error: fetchErr } = await supabase
    .from('session_requests')
    .select('id, coach_id, client_id, amount_cents, tenant_id, session_products(name)')
    .eq('id', sessionRequestId)
    .single()

  if (fetchErr || !sessionRequest) {
    logServerError('stripe-webhook', fetchErr ?? new Error('session_request not found'), { sessionRequestId })
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
    logServerError('stripe-webhook', paymentInsertErr, { sessionRequestId })
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }

  const { error: updateErr } = await supabase
    .from('session_requests')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('id', sessionRequestId)

  if (updateErr) {
    logServerError('stripe-webhook', updateErr, { sessionRequestId })
  }

  return NextResponse.json({ received: true })
}
