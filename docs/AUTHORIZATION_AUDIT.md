# Authorization and Access Control Audit

This document summarizes the authorization and access control posture of the application, including route protection, server action ownership checks, API permission checks, client data scoping, and recommendations.

---

## 1. Route protection (coach vs client)

### Layouts (primary enforcement)

- **Coach layout** (`app/coach/layout.tsx`): Requires an authenticated `user`; loads `profile.role`. If `profile?.role !== 'coach'`, redirects to `/client/dashboard`. Coach-only routes are therefore inaccessible to clients.
- **Client layout** (`app/client/layout.tsx`): Requires an authenticated `user`; if `profile?.role === 'coach'`, redirects to `/coach/dashboard`. Client routes are not usable by coaches.

### Middleware

- **`middleware.ts`**: For `/coach` and `/client`, only verifies that a session exists and redirects to login if not. Role is **not** checked in middleware; role enforcement is done in the layouts above.

### Root and auth pages

- **`app/page.tsx`**: After resolving user and profile, redirects coaches to `/coach/dashboard` and others to `/client/dashboard`.
- **Login / set-password**: Redirect by role after successful auth (e.g. coach → coach dashboard).

**Conclusion:** Coach-only routes cannot be accessed by clients, and client routes cannot be used by coaches; enforcement is in layouts and root redirect.

---

## 2. Client data scoping (no cross-client access)

All client-facing data loading is keyed by the current user’s identity (client derived from `user.email` or session), not by unvalidated URL/params.

| Location | Behavior |
|----------|----------|
| **`app/client/dashboard/page.tsx`** | Server component: client by `user?.email`; sessions, programs, daily message by `client.id` or `client.coach_id`. |
| **`app/client/programs/page.tsx`** | Client by `user?.email`; program_assignments and lessons by `client.id`. |
| **`app/client/videos/page.tsx`** | Client by `user?.email`; video_assignments and completions by `client.id`. |
| **`app/client/schedule/page.tsx`** | Client component: client by `user.email`; slots/sessions/requests/time requests by `clientData.id` or `clientData.coach_id`. |
| **`app/client/messages/page.tsx`** | Client by `user.email`; messages filtered by `(user.id, coach.id)` thread; session_requests by `clientData.id`. |

Coach detail view:

- **`app/coach/clients/[id]/page.tsx`**: Loads client with `.eq('id', id).eq('coach_id', user!.id)`. Only the coach’s own client is shown; otherwise `notFound()`.

**Conclusion:** Client routes do not allow access to other clients’ data; coach client detail is restricted to the owning coach.

---

## 3. Server actions – ownership and permissions

| Action / file | Check | Notes |
|---------------|--------|------|
| **`app/coach/clients/[id]/actions.ts`** | `deleteClientAction`, `updateClientProfileAction`: auth, then all DB operations with `.eq('coach_id', user.id)` (update also `.eq('client_id', tenantId)`). | Only the coach’s client can be updated/deleted. |
| **`app/coach/clients/actions.ts`** | `bulkUpdateClientNamesAction`, `bulkDeleteClientsAction`: auth, then `.eq('coach_id', user.id).in('id', ids)`. | Only the coach’s clients are affected. |
| **`app/coach/programs/[id]/actions.ts`** | `reorderProgramLessonsAction`: loads program with `.eq('coach_id', user.id)` before updating lessons. | Only the coach’s program can be reordered. |
| **`app/client/settings/actions.ts`** | `updateClientPhoneAction`: finds client by `user.email`, updates by that `client.id`. | Identity from session; RLS enforces tenant. Optional hardening: scope client lookup by tenant (see below). |
| **`app/coach/dashboard/actions.ts`** | `dismissOnboardingChecklist`: updates `profiles` by `user.id`. | User’s own profile only. |

**Conclusion:** Server actions that modify coach or client data validate ownership (coach_id or client derived from authenticated user); no actions found that rely solely on URL/params without server-side ownership checks.

---

## 4. API routes – sensitive operations

| Route | Auth / role | Ownership / scope |
|-------|-------------|-------------------|
| **`app/api/stripe/create-checkout-session/route.ts`** | User required. | Loads `session_request` by id, then `client` by `session_request.client_id`; enforces `client.email === user.email` → else 403. Only the client who owns the request can start checkout. |
| **`app/api/stripe/request-payment/route.ts`** | User required. | Loads `client` by body `clientId`; enforces `client.coach_id === user.id` → else 404. Only the coach who owns the client can create the payment link. |
| **`app/api/calendar/feed/route.ts`** | User required; `profile?.role !== 'coach'` → 403. | Sessions and slots loaded with `.eq('coach_id', user.id)`. Coach-only, own data only. |
| **`app/api/invite-client/route.ts`** | User required; `profile?.role !== 'coach'` → 403. | Coach-only; invite flow uses tenant/context as implemented. |
| **`app/api/create-client-account/route.ts`** | User required; `profile?.role !== 'coach'` → 403. | Coach-only. |
| **`app/api/sessions/[id]/send-reminder/route.ts`** | User required; `profile?.role !== 'coach'` → 403. | Loads session by id; enforces `session.coach_id === user.id` → else 403. Only the session’s coach can send reminder. |
| **`app/api/webhooks/n8n-session-booked/route.ts`** | User required. | Body includes `coach_id`; enforces `coach_id === user.id` → else 403. Only the coach who owns the session can trigger. |
| **`app/api/webhooks/stripe/route.ts`** | No user auth. | Validates Stripe signature; uses service client and event metadata. Caller is Stripe; idempotency and metadata are trusted from signed webhook. |

**Conclusion:** Sensitive API routes require auth and (where applicable) role or resource ownership; Stripe webhook correctly relies on signature verification and service role, not user session.

---

## 5. Database (RLS) and tenant isolation

- **Tenant isolation**: Migrations (e.g. `20240102000000_add_tenant_isolation.sql`) introduce `client_id` / `tenant_id` and RLS policies using `get_current_client_id()` so that coaches and clients only see data in their tenant.
- **Server Supabase client**: `createClient()` in `lib/supabase/server.ts` uses the request session and, when `clientId` is set, can sync profile `tenant_id` so RLS sees the correct tenant.
- **Client-side and server-side queries**: Under RLS, client lookups by `user.email` and coach lookups by `user.id` only return rows allowed by policy (e.g. “Clients can view themselves in their tenant”), so even if an action did not explicitly filter by tenant, RLS still restricts rows. Explicit tenant filters remain recommended for defense in depth.

---

## 6. Gaps and recommendations

| Item | Severity | Recommendation |
|------|----------|----------------|
| **Client settings – tenant in action** | Low | `updateClientPhoneAction` finds client by `user.email` only. RLS already restricts to the user’s tenant. For defense in depth, consider scoping the client lookup by tenant (e.g. `.eq('client_id', getClientId())` or equivalent) where the schema supports it. |
| **Middleware role check** | Optional | Middleware could reject non-coach from `/coach` and non-client from `/client` earlier; current design relies on layouts and is consistent. |

---

## 7. Summary

- **Coach-only routes:** Enforced in coach layout (role check + redirect). Clients cannot access coach routes.
- **Client routes:** Enforced in client layout (coaches redirected to coach dashboard). Clients cannot access other clients’ data; all client data is keyed by the authenticated user’s client identity.
- **Server actions:** Coach actions scope by `coach_id` (and tenant where applicable); client actions use the client derived from the authenticated user. Ownership is validated server-side.
- **Sensitive APIs:** Require auth; coach-only endpoints check role; payment and calendar endpoints validate resource ownership (client email or coach_id). Webhooks use signature verification (Stripe) or auth + coach_id (n8n).
- **RLS and tenant:** Policies and `get_current_client_id()` provide an additional layer so that even misconfigured app code cannot expose other tenants’ or other clients’ data through the Supabase client used with the user’s session.

No critical authorization or access-control gaps were found. The optional hardening above can be applied as needed.
