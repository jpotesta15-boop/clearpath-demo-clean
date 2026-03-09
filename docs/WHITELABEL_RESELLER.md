# Whitelabel Reseller Guide – ClearPath Coach OS

This guide explains how to deploy ClearPath for multiple coaches (resellers or agencies). Each coach gets their own branded instance with their clients.

---

## Architecture Overview

- **One tenant per deployment**: Each coach = one deployment with unique `NEXT_PUBLIC_CLIENT_ID` (tenant)
- **Shared Supabase**: All coaches can use the same Supabase project; data is isolated by `tenant_id`
- **Custom branding**: Logo, colors, business name per deployment via `client-config.json` or env vars

---

## client-config.json Schema

Place `client-config.json` in the project root. When present, it is the **source of truth** for:

- Display name and business name
- Supabase tenant id (`supabaseClientId`)
- Primary/secondary brand colors
- Optional logo URL and feature flags

Environment variables still control **runtime secrets** (Supabase, Stripe, etc.), and may provide **default values** for colors and names when the file is missing.

```json
{
  "clientName": "Coach Jane Fitness",
  "businessName": "Jane's Kickboxing Studio",
  "supabaseClientId": "coach-jane",
  "brandColors": {
    "primary": "#0284c7",
    "secondary": "#0369a1"
  },
  "logo": "https://your-cdn.com/coach-jane-logo.png",
  "features": {
    "groupSessions": true,
    "videoLibrary": true
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `clientName` | string | Yes | Display name (login header, metadata) |
| `businessName` | string | Yes | Business name (often same as clientName) |
| `supabaseClientId` | string | Yes | Tenant ID used by Supabase RLS; should match `NEXT_PUBLIC_CLIENT_ID` |
| `brandColors.primary` | string | Yes | Hex color (e.g. `#0284c7`) |
| `brandColors.secondary` | string | Yes | Hex color (e.g. `#0369a1`) |
| `logo` | string | No | URL to logo image |
| `features.groupSessions` | boolean | No | Default `true` |
| `features.videoLibrary` | boolean | No | Default `true` |

---

## Environment Variables (when client-config.json is missing)

If `client-config.json` is **not present**, the app falls back to environment variables for branding:

| Variable | Used for | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_CLIENT_ID` | Tenant id (`supabaseClientId`) | `coach-jane` |
| `NEXT_PUBLIC_CLIENT_NAME` | `clientName`, `businessName` | `Coach Jane Fitness` |
| `NEXT_PUBLIC_BRAND_PRIMARY` | `brandColors.primary` | `#0284c7` |
| `NEXT_PUBLIC_BRAND_SECONDARY` | `brandColors.secondary` | `#0369a1` |

**Priority rules (summary):**

- If `client-config.json` exists:
  - Names and `supabaseClientId` come from the file.
  - Brand colors come from `NEXT_PUBLIC_BRAND_*` if set; otherwise from the file.
- If `client-config.json` is missing:
  - All branding and `supabaseClientId` come from env vars (with sensible defaults).

---

## Quick Setup Script

Generate `client-config.json` for a new coach:

**PowerShell (Windows):**
```powershell
.\scripts\setup-coach.ps1 -CoachSlug "coach-jane" -CoachName "Jane's Fitness" -PrimaryColor "#0284c7" -SecondaryColor "#0369a1"
```

**Bash (Mac/Linux):**
```bash
./scripts/setup-coach.sh coach-jane "Jane's Fitness" "#0284c7" "#0369a1"
```

---

## Deployment Steps (Per Coach)

### 1. Create Tenant in Supabase

Run in Supabase SQL Editor (replace placeholders):

```sql
-- Coach will be created on first signup, or add manually:
-- INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
-- VALUES ('COACH_UUID', 'coach@example.com', 'Coach Name', 'coach', 'coach-slug');
-- Ensure tenant_id matches NEXT_PUBLIC_CLIENT_ID
```

If the coach signs up as the first user in their tenant, `handle_new_user` assigns `role = 'coach'`. The app syncs `tenant_id` from `NEXT_PUBLIC_CLIENT_ID` on first login.

### 2. Deploy to Vercel

**Option A: Separate Vercel project per coach**

1. Create new Vercel project; connect same Git repo
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_CLIENT_ID` = `coach-slug`
   - `NEXT_PUBLIC_CLIENT_NAME` = `Coach Jane Fitness`
   - `NEXT_PUBLIC_BRAND_PRIMARY` = `#0284c7`
   - `NEXT_PUBLIC_BRAND_SECONDARY` = `#0369a1`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (if using payments)
3. Deploy

**Option B: Single project with multiple deployments (branch or preview)**

Use Vercel's environment scoping (Production, Preview) or different branches with different env vars. Less common for true multi-tenant.

### 3. Custom Domain (Optional)

1. In Vercel project → Settings → Domains
2. Add domain (e.g. `jane.yourproduct.com`)
3. Configure DNS as instructed
4. Add production URL to Supabase Redirect URLs

### 4. Favicon (Optional)

Replace `public/favicon.svg` with coach's favicon before deploy, or use a build step to copy per-tenant assets.

---

## Supabase Configuration (Shared Project)

- **Redirect URLs**: Add each coach's production URL (e.g. `https://jane.yourproduct.com/auth/callback`)
- **Site URL**: Set to your primary app URL, or use per-deployment if each coach has custom domain
- **Google OAuth**: Single callback URL `https://<project-ref>.supabase.co/auth/v1/callback` works for all deployments

---

## Checklist for New Coach

- [ ] Tenant ID chosen (e.g. `coach-jane`)
- [ ] `client-config.json` or env vars set
- [ ] Vercel deployment created with correct env
- [ ] Supabase Redirect URLs include coach's URL
- [ ] Coach can sign up or is created manually with `tenant_id`
- [ ] Stripe Connect (coach connects their own account in app)
- [ ] n8n automations: `N8N_DEFAULT_COACH_ID` = coach UUID if using video workflow

---

## References

- [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) – Full env and Supabase checklist
- [CLIENT_SETUP.md](../CLIENT_SETUP.md) – Original client setup (if using scripts)
- [QA_TESTING_GUIDE.md](QA_TESTING_GUIDE.md) – Verify coach and client flows
