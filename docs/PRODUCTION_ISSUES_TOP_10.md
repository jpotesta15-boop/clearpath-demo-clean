# Top 10 Production Issues (Senior SaaS Engineer Review)

This document identifies the **top 10 issues** that could cause problems in production, focusing on reliability, performance, data integrity, security, error handling, and scalability. It does not cover UI/design.

---

## 1. Multi-step mutations have no transactional consistency (Reliability / Data integrity)

**Severity: High**

**What:** Critical flows perform two or more dependent DB operations with no transaction or rollback:

- **Stripe webhook:** Insert payment → update session_request to `paid` → (if slot) insert session → update session_request to `scheduled`. If the last update fails, the session exists but session_request stays `paid`.
- **Coach schedule (pick time):** Insert session → update session_request to `scheduled`. If the second fails, session_request stays `availability_submitted` while a session exists.
- **Coach offer from time request:** Insert session_request → update client_time_request. If the second fails, client_time_request is not linked.

**Impact:** Inconsistent state (e.g. session exists but offer not marked scheduled), confusing UX, and manual or one-off fixes.

**Recommendation:** Use a single DB transaction where possible (e.g. Supabase RPC that runs multiple statements in one transaction, or Postgres function). At minimum, make the “status update” step idempotent and retry once on failure; consider a small background job or cron that reconciles session_request status where a session exists but request is not `scheduled`.

---

## 2. Create-client-account leaves orphaned user on partial failure (Reliability / Data integrity)

**Severity: High**

**Where:** `app/api/create-client-account/route.ts`

**What:** `createUser` succeeds, then `profiles.update({ tenant_id })` runs. If the profile update fails, the handler returns 500 and the user is left with an account but missing or wrong `tenant_id`. There is no rollback of the created auth user.

**Impact:** New clients can sign in but RLS/tenant logic may hide their data or put them in the wrong tenant. Support/debugging is hard.

**Recommendation:** Prefer a single transactional flow (e.g. DB function that creates profile with tenant_id, or Supabase Auth hook that sets profile). If keeping two steps, add a retry for the profile update and/or an idempotent “repair” that sets tenant_id by user id; document recovery. Consider failing the whole request and deleting the user if profile update fails (best-effort rollback).

---

## 3. Health check does not verify dependencies (Reliability)

**Severity: High**

**Where:** `app/api/health/route.ts`

**What:** Returns `{ ok: true }` with no checks for Supabase, Stripe env, or Redis (rate limiting). Load balancers and orchestrators will mark the app healthy even when DB or critical env is down or missing.

**Impact:** Traffic can be sent to an instance that cannot serve requests; deployments appear successful while the app is broken.

**Recommendation:** Add a readiness check that (at least) opens a Supabase connection (e.g. single cheap query or `auth.getSession`). Optionally check Stripe env and Redis connectivity. Keep the handler fast (e.g. one DB ping, short timeout). Use a separate `/api/health/live` for “process up” if needed.

---

## 4. Widespread swallowed errors and missing user feedback (Error handling / Reliability)

**Severity: High**

**What:** Many `catch` blocks are empty or only set a generic state without logging or surfacing the cause:

- **Auth/callback, login, invite-client, create-client-account:** `catch { }` or minimal handling; no structured logging, no user-visible “something went wrong” in some paths.
- **DashboardContent (broadcast, Stripe connect):** `catch { }` with no log or message.
- **Client/coach messages, schedule, RequestPaymentButton, DeleteClientButton:** Errors from fetch or Supabase often not logged; user may see no feedback or a generic message.
- **lib/supabase/server.ts:** Cookie `setAll` in Server Components catches and ignores; expected for SSR but still a silent failure path.

**Impact:** Production incidents are hard to diagnose; users get no clear feedback when an action fails; metrics/alerting cannot be built on real error rates.

**Recommendation:** In every catch or error branch: (1) log with context (route name, user id if safe, error message/code) to a structured logger; (2) show a consistent user-visible message (e.g. “Something went wrong. Please try again.” or a specific message when the cause is known). Prefer a small `logServerError` / `reportError` helper used everywhere.

---

## 5. “Mark as paid” can leave session paid without a payment row (Data integrity)

**Severity: Medium–High**

**Where:** `app/coach/schedule/page.tsx` (handleMarkAsPaid), `app/coach/clients/[id]/SessionHistoryWithPay.tsx` (handleMarkAsPaid)

**What:** Code updates `sessions.paid_at`, then inserts into `payments` without checking the insert result. If the insert fails (e.g. constraint, connection drop), the session is marked paid but no payment row exists.

**Impact:** Revenue and payment history (which rely on `payments`) are wrong; reconciliation and reporting are broken.

**Recommendation:** Either: (1) insert payment first, then update `sessions.paid_at` and treat the session update as the “commit” (and roll back payment if session update fails), or (2) keep current order but check the payment insert result and, on failure, clear `sessions.paid_at` and show an error so the user can retry. Prefer (1) or a single DB transaction (e.g. RPC) that does both.

---

## 6. Rate limiting is per-instance when Redis is not used (Security / Scalability)

**Severity: Medium**

**Where:** `lib/rate-limit.ts`, middleware, invite-client, create-client-account, auth/callback

**What:** When `UPSTASH_REDIS_REST_*` is not set, rate limiting uses an in-memory `Map`. In multi-instance or serverless deployments, each instance has its own map, so limits apply per instance, not globally.

**Impact:** Login, auth callback, invite, and create-account can be brute-forced or spammed by spreading requests across instances. Abuse is harder to detect and block.

**Recommendation:** In production, require Redis (or another shared store) for rate limiting and fail startup or health if not configured. Document that in-memory mode is for single-instance dev only. Optionally add a strict global limit in the DB (e.g. “max failed logins per email per hour”) as a backstop.

---

## 7. No pagination on list queries (Performance / Scalability)

**Severity: Medium**

**What:** Many list views and API responses load full sets with no limit or pagination:

- **Coach:** clients, payments, messages, session_requests, programs, videos, availability_slots, sessions (schedule), client_time_requests.
- **Client:** sessions, session_requests, messages, program assignments.
- **Coach client detail:** sessions (capped at 10), program_assignments, session_requests with no cap.

**Impact:** As tenants grow (hundreds of clients, thousands of sessions or messages), response sizes and query times grow. Risk of timeouts, memory pressure, and poor UX (e.g. slow “Clients” or “Payments” page).

**Recommendation:** Introduce pagination (or “load more”) for: clients list, payments list, messages (threads and messages), session_requests where appropriate. Use `.range(from, to)` or cursor-based limits and enforce a max page size (e.g. 50). Add indexes for sort keys used in pagination.

---

## 8. Sensitive API routes not rate limited (Security)

**Severity: Medium**

**Where:** Stripe and other money/auth-adjacent routes

**What:** Only login, forgot-password, auth-callback, invite-client, and create-client-account are rate limited. These are not:

- **POST /api/stripe/create-checkout-session** – Can be called repeatedly to create many checkout sessions (abuse, cost, or confusion).
- **POST /api/stripe/request-payment** – Can be spammed to generate many payment links.
- **POST /api/sessions/[id]/send-reminder** – Can be used to spam reminders.
- **GET /api/calendar/feed** – Could be hammered for scraping.

**Impact:** Abuse (spam, DoS, or scraping) without automatic throttling; Stripe or n8n may rate-limit or block at their side.

**Recommendation:** Add rate limiting (per user or per IP) to create-checkout-session, request-payment, and send-reminder. Use the same Redis-backed limiter in production. Consider a stricter limit for payment-related endpoints (e.g. 10–20 per minute per user).

---

## 9. Service role client throws on missing env (Reliability / Operations)

**Severity: Medium**

**Where:** `lib/supabase/service.ts`, any route using `createServiceClient()`

**What:** `createServiceClient()` throws if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. The first request that hits an API using it (e.g. Stripe webhook, create-client-account, calendar feed) gets a 500 with no explicit “config missing” message unless the error is logged.

**Impact:** Misconfigured deployments (e.g. missing env in one environment) fail at request time instead of at startup. Harder to distinguish “config error” from “transient error.”

**Recommendation:** Keep throw for missing env (fail fast), but: (1) ensure all such errors are logged with a clear “missing env” message; (2) have the health/readiness check validate that required env vars are set (and optionally that Supabase is reachable), so deploy/health fails early.

---

## 10. Stripe webhook and coach schedule: session_request → scheduled update not retried (Data integrity / Reliability)

**Severity: Medium**

**Where:** `app/api/webhooks/stripe/route.ts`, `app/coach/schedule/page.tsx` (handleConfirmScheduleWithDateTime)

**What:** After creating a session, the code updates session_request to `scheduled`. On failure, the webhook only logs and returns success; the coach schedule flow does not retry or revert the session. So session can exist while session_request remains `paid` or `availability_submitted`.

**Impact:** Client and coach may see conflicting states (e.g. “scheduled” session vs “waiting for time” offer). Manual correction or support required.

**Recommendation:** Make the status update idempotent (e.g. “set status = 'scheduled' where id = ? and status in ('paid', 'availability_submitted')”). In the webhook, retry the update once or twice with a short delay before returning. In coach schedule, if the update fails, show an error and optionally revert the session insert (delete the created session) so the user can retry. Long term, do both operations in one DB transaction (see #1).

---

## Summary table

| # | Area | Severity | Category |
|---|------|----------|----------|
| 1 | Multi-step mutations not transactional | High | Reliability, Data integrity |
| 2 | Create-client-account partial failure | High | Reliability, Data integrity |
| 3 | Health check ignores dependencies | High | Reliability |
| 4 | Swallowed errors, no logging/feedback | High | Error handling, Reliability |
| 5 | Mark-as-paid payment insert unchecked | Medium–High | Data integrity |
| 6 | In-memory rate limit doesn’t scale | Medium | Security, Scalability |
| 7 | No pagination on lists | Medium | Performance, Scalability |
| 8 | Payment/auth APIs not rate limited | Medium | Security |
| 9 | Service client throws at request time | Medium | Reliability, Operations |
| 10 | session_request → scheduled not retried | Medium | Data integrity, Reliability |

---

## Suggested order of work

1. **#4** – Introduce consistent error logging and user feedback (reduces blind spots and improves diagnostics for all other issues).
2. **#3** – Add a real readiness check (DB + optional env) so deployments and LB know when the app is actually healthy.
3. **#5** – Fix “mark as paid” so payment insert is checked and/or ordered/transactional with session update.
4. **#2** – Harden create-client-account (transaction, retry, or rollback) so tenant_id is never left wrong.
5. **#1 and #10** – Add transaction or idempotent retry for session + session_request flows.
6. **#6 and #8** – Require Redis in prod for rate limiting and add limits to payment/auth APIs.
7. **#7** – Add pagination to the largest lists (clients, payments, messages).
8. **#9** – Validate critical env (and optionally DB) in health so misconfiguration fails at deploy/health time.

This order prioritizes observability and correctness first, then security and scalability.
