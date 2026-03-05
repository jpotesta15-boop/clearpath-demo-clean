-- Idempotency for Stripe webhooks: store processed event IDs to avoid duplicate payment recording on retries.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stripe_webhook_events IS 'Stripe webhook event IDs already processed; used for idempotency.';
