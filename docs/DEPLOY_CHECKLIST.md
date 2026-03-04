# Deploy checklist

Use this list before going live or when setting up a new environment.

## Environment variables

Set these in `.env.local` (local) or your host’s environment (e.g. Vercel, Railway):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; used for invite and webhooks. Never expose to the client. |
| `NEXT_PUBLIC_CLIENT_ID` | Yes | Tenant ID (e.g. `demo` or your production tenant) |
| `N8N_VIDEO_WEBHOOK_SECRET` | If using n8n | Shared secret for `/api/webhooks/n8n-video` |
| `N8N_DEFAULT_COACH_ID` | Optional | Default coach UUID when n8n sends a video without `coach_id` |

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

## Production

- Add your production base URL to Supabase **Redirect URLs** and set **Site URL** to the production URL.
- In Google OAuth (Google Cloud Console), add the production callback URL if you use Google login.
- Use **HTTPS** in production.
- **Run all migrations** on the production DB in order. Apply every file in `supabase/migrations/` in alphabetical order (oldest first). See [SQL_AND_MIGRATIONS.md](SQL_AND_MIGRATIONS.md) for the full list. If using Supabase CLI: `supabase db push`. Do not skip migrations.

## References

- [auth-google.md](auth-google.md) – Google OAuth setup
- [PRODUCTION_READINESS_REVIEW.md](PRODUCTION_READINESS_REVIEW.md) – Gaps and hardening
