# Deploy checklist

Use this list before going live or when setting up a new environment.

## Environment variables

Set these in `.env.local` (local) or your host’s environment (e.g. Vercel, Railway):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; used for invite and webhooks. Never expose to the client. |
| `NEXT_PUBLIC_CLIENT_ID` | Yes | Tenant ID for this deployment (e.g. `demo`, `coach-jane`). Must match `tenant_id` in `profiles` and, if present, `supabaseClientId` in `client-config.json`. |
| `STRIPE_SECRET_KEY` | Yes (for payments) | Stripe API key; used for Checkout and Connect |
| `STRIPE_WEBHOOK_SECRET` | Yes (for payments) | Stripe webhook signing secret; verifies `checkout.session.completed` |
| `N8N_VIDEO_WEBHOOK_SECRET` | If using n8n video | Shared secret for `/api/webhooks/n8n-video` |
| `N8N_DEFAULT_COACH_ID` | Optional | Default coach UUID when n8n sends a video without `coach_id` |
| `N8N_SESSION_BOOKED_WEBHOOK_URL` | Optional | n8n webhook URL for session confirmation emails (e.g. `https://your-n8n.com/webhook/session-booked`) |
| `SUPABASE_SESSION_WEBHOOK_SECRET` | Optional | Secret for Supabase Database Webhook on `sessions` INSERT; used by `/api/webhooks/session-created` so n8n fires whenever a session is added |
| `N8N_SESSION_REMINDER_SECRET` | Optional | Bearer secret for `GET /api/sessions/upcoming` (session reminder workflow) |
| `NEXT_PUBLIC_BRAND_PRIMARY` | Optional (whitelabel) | Primary brand color (hex, e.g. `#0284c7`). Used as a default when `client-config.json` is missing or omits a primary color. |
| `NEXT_PUBLIC_BRAND_SECONDARY` | Optional (whitelabel) | Secondary brand color (hex, e.g. `#0369a1`). Used as a default when `client-config.json` is missing or omits a secondary color. |
| `NEXT_PUBLIC_DEMO_MODE` | Optional | Set to `true` to show demo credentials on login; omit for production |
| `UPSTASH_REDIS_REST_URL` | Optional (scale) | Upstash Redis URL for rate limiting; omit to use in-memory (single-instance only) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional (scale) | Upstash Redis token; required if using UPSTASH_REDIS_REST_URL |

## Supabase configuration

1. **Authentication → URL Configuration**
   - **Site URL:** Your app URL (e.g. `https://yourdomain.com` or `http://localhost:3000` for local).
   - **Redirect URLs:** Add:
     - `http://localhost:3000/auth/callback` (local)
     - `https://yourdomain.com/auth/callback` (production)

2. **Authentication → Providers → Google** (if using Google login)
   - Enable Google and add Client ID + Secret from Google Cloud Console.
   - In Google Cloud Console, add this redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

3. **Invite emails**
   - **Authentication → Email** (or Project Settings → Auth → SMTP): Configure so invite emails can be sent. Without this, “Send portal invite” will fail or appear to do nothing. Use Supabase’s built-in email or custom SMTP.

4. **Storage (avatars)**
   - Coach profile picture / logo uploads use the **avatars** bucket. It is created by migration `20240114000000_storage_avatars.sql`. Run all migrations (e.g. `supabase db push`) so the bucket and RLS policies exist.

5. **Favicon (whitelabel)**
   - Default favicon is `public/favicon.svg`. Replace with your own favicon for whitelabel deployments.

## Production

- Add your production base URL to Supabase **Redirect URLs** and set **Site URL** to the production URL.
- In Google OAuth (Google Cloud Console), add the production callback URL if you use Google login.
- Use **HTTPS** in production.
- **Run all migrations** on the production DB in order. Apply every file in `supabase/migrations/` in alphabetical order (oldest first). See [SQL_AND_MIGRATIONS.md](SQL_AND_MIGRATIONS.md) for the full list. If using Supabase CLI: `supabase db push`. Do not skip migrations.

## Stripe Checkout

- **Coach must connect Stripe** in the coach Dashboard before clients can pay. If the coach has not connected Stripe, "Accept & pay" will show an error to the client.
- **Stripe Checkout is hosted by Stripe** – no custom checkout page is required. The app creates a Checkout session and redirects the client to Stripe’s payment page.
- Set **STRIPE_SECRET_KEY** and **STRIPE_WEBHOOK_SECRET** in your environment.
- **Webhook URL:** `https://your-app.com/api/webhooks/stripe` – register this in the Stripe Dashboard (Developers → Webhooks) and subscribe to `checkout.session.completed`.

## References

- [auth-google.md](auth-google.md) – Google OAuth setup
- [PRODUCTION_READINESS_REVIEW.md](PRODUCTION_READINESS_REVIEW.md) – Gaps and hardening
- [n8n/README.md](../n8n/README.md) – n8n workflow setup (session-booked emails, Google Drive videos)
