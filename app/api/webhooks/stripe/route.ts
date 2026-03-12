import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getSafeMessage, logServerError } from '@/lib/api-error'
import { validateStripeEnv } from '@/lib/env'
import { notifySessionBooked } from '@/lib/notify-session-booked'
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
  const paymentType = session.metadata?.type

  if (paymentType === 'balance') {
    const clientId = session.metadata?.client_id
    const coachId = session.metadata?.coach_id
    const tenantId = session.metadata?.tenant_id ?? 'default'
    const idsStr = session.metadata?.session_request_ids
    if (!clientId || !coachId || !idsStr) {
      logServerError('stripe-webhook', new Error('balance payment missing metadata'))
      return NextResponse.json({ error: 'Invalid balance payment metadata' }, { status: 400 })
    }
    const sessionRequestIds = idsStr.split(',').filter(Boolean)
    const amountCents = session.amount_total ?? 0

    const { error: paymentErr } = await supabase.from('payments').insert({
      coach_id: coachId,
      client_id: tenantId,
      amount_cents: amountCents,
      currency: 'usd',
      status: 'succeeded',
      provider: 'stripe',
      stripe_payment_intent_id: session.payment_intent as string ?? null,
      payer_client_id: clientId,
      description: 'Balance payment',
    })
    if (paymentErr) {
      logServerError('stripe-webhook', paymentErr, { context: 'balance payment' })
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    for (const rid of sessionRequestIds) {
      await supabase
        .from('session_requests')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', rid)
    }
    return NextResponse.json({ received: true })
  }

  const sessionRequestId = session.metadata?.session_request_id ?? session.client_reference_id
  if (!sessionRequestId) {
    logServerError('stripe-webhook', new Error('no session_request_id in metadata'))
    return NextResponse.json({ error: 'Missing session_request_id' }, { status: 400 })
  }

  const { data: sessionRequest, error: fetchErr } = await supabase
    .from('session_requests')
    .select('id, coach_id, client_id, amount_cents, tenant_id, session_product_id, availability_slot_id, session_products(name)')
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

  if (sessionRequest.availability_slot_id) {
    const { data: existingSessions, error: sessionsErr } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('availability_slot_id', sessionRequest.availability_slot_id)
      .in('status', ['pending', 'confirmed', 'completed'])

    if (sessionsErr) {
      logServerError('stripe-webhook', sessionsErr, { sessionRequestId })
      return NextResponse.json({ received: true })
    }

    if (!existingSessions || existingSessions.length === 0) {
      const { data: slot, error: slotErr } = await supabase
        .from('availability_slots')
        .select('start_time')
        .eq('id', sessionRequest.availability_slot_id)
        .single()

      if (slotErr) {
        logServerError('stripe-webhook', slotErr, { sessionRequestId })
        return NextResponse.json({ received: true })
      }

      const { data: newSession, error: sessionInsertErr } = await supabase
        .from('sessions')
        .insert({
          coach_id: sessionRequest.coach_id,
          client_id: sessionRequest.client_id,
          availability_slot_id: sessionRequest.availability_slot_id,
          scheduled_time: slot.start_time,
          status: 'confirmed',
          tenant_id: sessionRequest.tenant_id,
          session_request_id: sessionRequest.id,
          session_product_id: sessionRequest.session_product_id ?? null,
          amount_cents: sessionRequest.amount_cents ?? null,
        })
        .select('id')
        .single()

      if (sessionInsertErr) {
        logServerError('stripe-webhook', sessionInsertErr, { sessionRequestId })
        return NextResponse.json({ received: true })
      }

      const { error: markScheduledErr } = await supabase
        .from('session_requests')
        .update({ status: 'scheduled', updated_at: new Date().toISOString() })
        .eq('id', sessionRequestId)

      if (markScheduledErr) {
        logServerError('stripe-webhook', markScheduledErr, { sessionRequestId })
        const { error: retryErr } = await supabase
          .from('session_requests')
          .update({ status: 'scheduled', updated_at: new Date().toISOString() })
          .eq('id', sessionRequestId)
        if (retryErr) {
          logServerError('stripe-webhook', retryErr, { sessionRequestId, context: 'retry' })
        }
      }

      void notifySessionBooked(
        newSession.id,
        sessionRequest.coach_id,
        sessionRequest.client_id,
        slot.start_time,
        'payment_confirmed'
      )
    }
  }

  return NextResponse.json({ received: true })
}
