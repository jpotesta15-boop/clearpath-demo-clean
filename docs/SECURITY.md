# Security

## Implemented measures

- **Security headers:** CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS (production). See `next.config.ts` and `middleware.ts`.
- **CORS:** Explicit for `/api/*`; origin from `NEXT_PUBLIC_APP_URL` or same origin. See `middleware.ts`.
- **Rate limiting:** Login/forgot page loads, auth callback, create-client-account, invite-client. See `lib/rate-limit.ts` and middleware.
- **Input validation:** Zod schemas for API routes and critical server actions. See `lib/validations/`.
- **Error handling:** No raw backend/auth errors to client; safe messages and server-side logging. See `lib/api-error.ts`, `lib/safe-messages.ts`.
- **Webhooks:** Stripe signature verification; n8n-video Bearer/header secret. Stripe webhook idempotency via `stripe_webhook_events` table.
- **Structured logging:** `lib/logger.ts` and `logServerError`; PII-redacted context.
- **Env validation:** `lib/env.ts`; Stripe webhook validates required env at request time.

## RLS and tenant isolation

- All tenant tables use RLS with `get_current_client_id()` and `auth.uid()`. See `supabase/migrations/20240102000000_add_tenant_isolation.sql`.
- Service role is used only for: create-user (invite, create-client), Stripe webhook, n8n-video webhook. Never for normal user flows.

## Adding new API routes or actions

1. Validate input with Zod (reuse or add schemas in `lib/validations/`).
2. Return errors via `getSafeMessage()` or a fixed user-facing string; log details with `logServerError()`.
3. If the route is sensitive (auth, invite, create-user), add rate limiting (e.g. `checkRateLimit` from `lib/rate-limit.ts`).
4. Use `createServerClient()` for user-context requests; use `createServiceClient()` only when RLS cannot be used (e.g. webhooks, admin create user).

## XSS

- Message and note content are rendered as React text (e.g. `{message.content}`), not as HTML, so they are escaped by default.
- If you add rich text or HTML rendering later, use a sanitizer (e.g. DOMPurify) and a strict CSP.
