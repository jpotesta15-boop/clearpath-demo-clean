# White-Label Readiness Report

**Document version:** 1.0  
**Date:** March 2026  
**Scope:** Multi-tenant white-labeling for coaches/organizations

---

## Executive summary

The application has been audited and extended for white-labeling. The following are in place or documented:

- **Multi-tenant branding:** `coach_brand_settings` stores per-coach brand (name, logo, favicon, colors, white-label flag). Extended with `brand_name`, `favicon_url`, `background_color`, `white_label`. Brand can drive UI via `BrandThemeProvider` and design tokens.
- **Custom domains:** Table `coach_domains` exists with domain, status, verification_token, ssl_status. Domain verification and routing are **documented**; full resolution in middleware requires edge/host configuration.
- **White-label email:** New table `coach_email_settings` (sender name/email, logo, footer). Email templates must be updated to pull these values when sending.
- **Platform branding removal:** `white_label` on `coach_brand_settings`. When true, UI should hide “Powered by” and platform logos (implementation in components is partial; see §4).
- **Client portal customization:** `coach_client_experience` has welcome message, hero, intro video; extended with `portal_nav_enabled`, `portal_booking_instructions`, `terminology` for optional renames (Client→Student, etc.).
- **Settings → Branding:** New page at `/coach/settings/branding` for logo, favicon, colors, custom domain display, email branding, welcome message, portal nav toggles.
- **Security:** RLS ensures coaches only manage their own brand/domains/email; clients can read their coach’s brand for portal display. Cross-tenant data access is prevented by existing tenant_id/client_id RLS.

---

## 1. Multi-tenant branding system

### Current state

| Item | Status | Notes |
|------|--------|------|
| `organization.brand` shape | ✅ | Implemented as `coach_brand_settings` + profiles (display_name, logo_url). One “organization” = one coach. |
| name, logoUrl, faviconUrl | ✅ | brand_name, logo_url, favicon_url (and app_icon_url) in DB. Settings UI in Branding page. |
| primaryColor, secondaryColor, accentColor | ✅ | primary_color, secondary_color, accent_color in coach_brand_settings. |
| backgroundColor | ✅ | Added in migration 20260312000000. |
| Dynamic UI tokens | ⚠️ | Root layout uses deploy-level `getBrandColors()`. Coach/client layouts can wrap with `BrandThemeProvider` and pass `getCoachBrand(supabase, coachId)` so accents use coach brand. |
| Dashboard header | ⚠️ | SidebarNav uses profile display_name + logo_url (and fallback to getClientName()). Can be switched to coach_brand_settings when present. |
| Client portal | ⚠️ | Client layout does not yet inject coach brand theme; can pass brand from getCoachBrand(supabase, client.coach_id) and BrandThemeProvider. |
| Login pages | ⚠️ | Login uses NEXT_PUBLIC_CLIENT_NAME. For custom-domain login, middleware/API can resolve domain → coach and pass brand for that page. |
| Emails | 📋 | coach_email_settings exists; templates need to pull sender_name, sender_email, email_logo_url, footer_text. |
| Booking pages | 📋 | Use same theme as client portal once brand is applied there. |
| Notifications | 📋 | In-app notifications use current theme; push/email need to use email branding when implemented. |

### Recommendations

- In **coach layout** and **client layout**, fetch brand via `getCoachBrand(supabase, coachId)`, then wrap children in `<BrandThemeProvider brand={brand}>` so semantic tokens (e.g. `--cp-accent-primary`) use the coach’s colors.
- Ensure **login** page can receive optional brand (e.g. from search param or domain resolution) and render logo/name when in white-label or custom-domain flow.

---

## 2. Custom domain support

### Current state

| Item | Status | Notes |
|------|--------|------|
| organization.customDomain | ✅ | `coach_domains.domain` |
| organization.domainVerified | ✅ | `coach_domains.domain_verified` (added); also `status = 'active'` |
| organization.domainStatus | ✅ | `coach_domains.status` (pending_verification, verifying, active, error, disabled) |
| Domain verification | 📋 | Table has verification_token, verification_method (dns_txt, http_file). Backend job or API must verify and set status/domain_verified. |
| DNS instructions | 📋 | Shown in Branding page when a domain exists (TXT record value). Full instructions (CNAME target, TXT name) should come from platform docs or API. |
| SSL provisioning | 📋 | `coach_domains.ssl_status` (not_started, provisioning, issued, failed). Handled at infra (e.g. Vercel, Cloudflare). |
| Routing to organization | 📋 | Middleware or edge must resolve Host → coach_id (or tenant_id) and set header (e.g. x-coach-id). App then uses it for brand and RLS. |

### Routing and security

- **Resolve domain → coach:** On first request (e.g. middleware or API route), query `coach_domains` WHERE domain = host AND status = 'active'. Get coach_id; optionally resolve tenant_id from profiles. Set `x-coach-id` and/or `x-tenant-id` on the request.
- **RLS:** All data access already scoped by tenant_id (get_current_client_id()). For custom-domain requests, the app must set `app.client_id` (or equivalent) to that tenant_id so RLS uses the correct tenant. Supabase server client sets tenant from profile after login; for unauthenticated custom-domain pages (e.g. login), ensure that after login the user’s profile.tenant_id matches the domain’s tenant.
- **Cross-tenant safety:** Never use the Host header alone for data access. Always resolve domain → (coach_id, tenant_id) in a single place, then use tenant_id for RLS. Validate that the authenticated user’s profile.tenant_id matches the resolved tenant when applicable.

### Database schema (existing + additions)

- `coach_domains`: id, coach_id, tenant_id, domain (UNIQUE), status, verification_token, verification_method, domain_verified (new), last_checked_at, error_message, requested_at, ssl_status.

---

## 3. White-label email system

### Current state

| Item | Status | Notes |
|------|--------|------|
| organization.emailSettings | ✅ | Table `coach_email_settings`: sender_name, sender_email, email_logo_url, footer_text. |
| Templates pull branding | 📋 | Any email sent on behalf of a coach (invites, reminders, notifications) should look up coach_email_settings by coach_id and use sender_name, sender_email, email_logo_url, footer_text in the template. |

### Recommendation

- Centralize “send email as coach” in a helper that accepts coach_id and loads coach_email_settings; merge into template data (e.g. senderName, senderEmail, logoUrl, footerText). Use deploy-level defaults when coach_email_settings is null.

---

## 4. Platform branding removal

### Current state

| Item | Status | Notes |
|------|--------|------|
| organization.whiteLabel | ✅ | coach_brand_settings.white_label (boolean). |
| Remove platform logos | 📋 | When white_label is true, SidebarNav/ClientNav/CoachNav and login should prefer organization logo/name only. |
| Remove “Powered by” | 📋 | Grep shows no literal “Powered by” in repo; any future footer or login line should be gated on !white_label. |

### Recommendation

- When resolving brand for layout, pass `brand.whiteLabel` into layout or a small context. In SidebarNav, CoachNav, ClientNav, and login, when whiteLabel is true: do not show platform name/logo; use only org name and logo.

---

## 5. Client portal customization

### Current state

| Item | Status | Notes |
|------|--------|------|
| Welcome message | ✅ | coach_client_experience.welcome_title, welcome_body; Settings → Client portal appearance. |
| Booking instructions | ✅ | coach_client_experience.portal_booking_instructions (new). Can be shown on schedule/booking page. |
| Terminology | ✅ | coach_client_experience.terminology (JSONB). e.g. {"client":"Student","session":"Lesson","coach":"Instructor"}. Use getTerminology() and replace labels in client portal. |

### Recommendation

- Client portal nav and copy should use `getPortalCustomization()` and render only sections in portal_nav_enabled; replace terms using the terminology map (e.g. “Session” → terminology.session).

---

## 6. White-label navigation (client portal)

### Current state

| Item | Status | Notes |
|------|--------|------|
| Toggle modules | ✅ | coach_client_experience.portal_nav_enabled (JSONB array). Default ["schedule","messages","programs","videos","payments"]. Branding page has checkboxes. |
| Apply in client layout | 📋 | Client layout currently serves a fixed nav. Filter nav items by portal_nav_enabled (from getPortalCustomization) so only enabled sections appear. |

### Recommendation

- In client layout, load client’s coach_id and tenant_id, call getPortalCustomization(supabase, coach_id, tenant_id), then filter clientNavItems by portalNavEnabled (e.g. map href to section id: /client/schedule → schedule) and pass filtered list to SidebarNav and MobileBottomNav.

---

## 7. Dynamic theme tokens

### Current state

| Item | Status | Notes |
|------|--------|------|
| --brand-primary, --brand-accent, --brand-background | ✅ | BrandThemeProvider sets --cp-brand-primary, --cp-accent-primary, etc., from OrgBrand. |
| Components respond | ✅ | Buttons, Card, StatusBadge use var(--cp-accent-primary) etc., so they respond when BrandThemeProvider wraps the tree. |

### Recommendation

- Ensure coach and client layouts wrap with BrandThemeProvider when brand is available so all nested components pick up the coach’s colors.

---

## 8. Environment and routing safety

### Cross-tenant and domain safety

| Check | Status | Notes |
|-------|--------|------|
| Cross-tenant data access impossible | ✅ | RLS on all tenant tables uses get_current_client_id() (from profile.tenant_id or app.client_id). |
| Custom domains cannot access other orgs’ data | 📋 | Guaranteed only if: (1) domain resolves to single coach_id/tenant_id, (2) app sets tenant for the request, (3) no data is keyed by Host alone. |
| Domain routing resolves to correct org | 📋 | Must be enforced in middleware/edge: lookup coach_domains by Host, set x-tenant-id/x-coach-id; app uses for brand and RLS. |

### Security checklist

- [ ] Middleware or edge: resolve Host to (coach_id, tenant_id) from coach_domains where status = 'active'; set headers; do not trust Host for any DB key.
- [ ] After login on custom domain, redirect to same domain and ensure profile.tenant_id is set (or already matches resolved tenant).
- [ ] Service role or admin APIs that fetch by domain: ensure they are not exposed to client and are rate-limited and audited.

---

## 9. Admin interface (Settings → Branding)

### Implemented

- **Logo upload** (and display)
- **Favicon URL** (text field; optional)
- **Primary color** (color picker + hex)
- **Accent color** (color picker + hex)
- **Background color** (optional)
- **Custom domain** (read-only display when domain exists; DNS TXT hint; note to contact support for setup)
- **Email branding:** sender name, sender email, email logo URL, footer text
- **Welcome message** (short; also in Client portal appearance)
- **Portal nav toggles** (schedule, messages, programs, videos, payments)
- **White-label mode** checkbox

All persist to coach_brand_settings, coach_email_settings, and coach_client_experience.

---

## 10. Deliverables summary

### 1. White-label readiness report

This document.

### 2. Missing architecture pieces (to implement)

- **Layouts:** Use getCoachBrand() and BrandThemeProvider in coach and client layouts so theme is per-coach.
- **Client layout:** Load getPortalCustomization(), filter nav by portal_nav_enabled, and optionally apply terminology in labels.
- **Login:** Support optional brand context (e.g. from domain or param) to show org logo/name.
- **Emails:** Use coach_email_settings in all coach-triggered email templates.
- **Platform branding:** When brand.whiteLabel is true, hide platform name/logo in nav and login.

### 3. Database schema additions (done)

- coach_brand_settings: brand_name, favicon_url, background_color, white_label.
- coach_email_settings: new table (coach_id, tenant_id, sender_name, sender_email, email_logo_url, footer_text).
- coach_client_experience: portal_nav_enabled, portal_booking_instructions, terminology.
- coach_domains: domain_verified.
- RLS: “Clients can read coach_brand_settings for their coach.”

### 4. Routing changes for custom domains

- **At edge/host (Vercel/Cloudflare/etc.):** Map custom host (e.g. portal.johnmuaythai.com) to the same Next app; optionally add a middleware or edge function that:
  - Looks up coach_domains by host.
  - Sets request header e.g. x-coach-id, x-tenant-id.
- **In Next.js middleware:** If Host is not the default app host, call an internal API or use Supabase (with service role) to resolve host → coach_id/tenant_id; set headers for downstream. Keep middleware light (cache domain → tenant map if needed).
- **In app:** Read x-tenant-id (or x-coach-id) where needed; for unauthenticated login page, use for branding; after login, ensure user’s tenant_id matches.

### 5. Security checks for multi-tenant domain routing

- Resolve domain to org in one place; never use Host as a DB key or in RLS directly.
- Ensure set_current_client_id / app.client_id is set from resolved tenant_id for the request so RLS is correct.
- Validate authenticated user’s tenant_id against resolved tenant when both are present.
- Use HTTPS only for custom domains; rely on platform SSL (e.g. Vercel) or explicit certificate provisioning.

---

## File reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20260312000000_white_label_branding.sql` | Schema for white-label (brand, email, portal nav, terminology, domain_verified, client read brand RLS). |
| `lib/white-label.ts` | Types (OrgBrand, CoachEmailSettings, PortalCustomization), normalizeOrgBrand, getTerminology, getPortalNavEnabled. |
| `lib/brand-resolver.ts` | Server helpers: getCoachBrand, getCoachEmailSettings, getPortalCustomization. |
| `components/providers/BrandThemeProvider.tsx` | Client component that injects brand colors into CSS variables. |
| `app/coach/settings/branding/page.tsx` | Settings → Branding UI (logo, favicon, colors, domain display, email, welcome, nav toggles, white-label). |
| `docs/WHITE_LABEL_READINESS_REPORT.md` | This report. |

---

*End of report*
