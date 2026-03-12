# Data Integrity Audit

This document audits data integrity across **clients**, **sessions**, **payments**, **offers** (session_requests), and **availability submissions** (client_time_requests, availability_slots). It summarizes schema relationships, mutation flows, and where state is kept consistent or can drift.

---

## 1. Schema relationships (summary)

| Entity | Key relations |
|--------|----------------|
| **clients** | `coach_id` → profiles. Referenced by: sessions.client_id, session_requests.client_id, payments.payer_client_id, client_time_requests.client_id. |
| **sessions** | `coach_id`, `client_id`, `availability_slot_id`, `session_request_id`, `session_product_id`, `amount_cents`, `paid_at`. status: pending | confirmed | cancelled | completed. |
| **session_requests** (offers) | `coach_id`, `client_id`, `session_product_id`, `availability_slot_id`, `tenant_id`. status: offered → accepted | payment_pending → paid → availability_submitted → scheduled | cancelled. |
| **payments** | `coach_id`, `client_id` (tenant), `session_request_id`, `session_id`, `payer_client_id`, amount_cents, status, provider. |
| **availability_slots** | `coach_id`, `session_product_id`, start_time, end_time. |
| **client_time_requests** | `client_id`, `coach_id`, `session_request_id` (set when coach creates offer from request), status: pending | offered | confirmed | declined. |

Intended flows:

- **Offer flow**: session_request (offered → accepted/payment_pending → paid → availability_submitted → coach picks time → session created, session_request → scheduled).
- **Direct book (client “request session”)**: session created with status pending, no session_request.
- **Direct book (coach “book session” without payment)**: session created confirmed, no session_request_id.
- **Book & pay (client picks paid slot)**: session_request created with availability_slot_id, client pays → webhook creates session and sets session_request to scheduled.

---

## 2. Mutations that maintain consistent state

### 2.1 Stripe webhook (single session_request)

**File:** `app/api/webhooks/stripe/route.ts`

- **Order of operations:** Insert payment (with `session_request_id`, `payer_client_id`) → update session_request to `paid` → if `availability_slot_id`: create session (with `session_request_id`, `session_product_id`, `amount_cents`) → update session_request to `scheduled`.
- **Consistency:** Payment row links to session_request. Session links to session_request. session_request status matches session existence when slot is set. If the final update to `scheduled` failed (logged but not fatal), session_request could remain `paid` while a session exists; recovery would be to re-run an update to `scheduled` for that id.

### 2.2 Stripe webhook (balance payment)

- Inserts one payment (no `session_request_id`; balance can cover multiple requests). Updates all referenced session_requests to `paid` by id. No session creation. Consistent for session_requests; payments table does not link balance payments to specific session_requests (schema is single `session_request_id`).

### 2.3 Create checkout session

**File:** `app/api/stripe/create-checkout-session/route.ts`

- After creating Stripe Checkout Session, updates session_request to `payment_pending`. Correct so the offer is not left as `accepted` if user abandons checkout.

### 2.4 Coach schedules from availability_submitted (custom date/time)

**File:** `app/coach/schedule/page.tsx` – `handleConfirmScheduleWithDateTime`

- Inserts session (with `session_request_id`, `availability_slot_id: null`) → updates session_request to `scheduled`. Two round-trips; if the second fails, session_request can stay `availability_submitted` while session exists. No transactional wrapper.

### 2.5 Coach offers from client_time_request

**File:** `app/coach/schedule/page.tsx` – `handleOfferFromTimeRequest`

- Inserts session_request (status `offered`) → updates client_time_request with `status: 'offered'`, `session_request_id: sessionRequest.id` → optional message insert. Links client_time_request to session_request correctly.

### 2.6 Client declines offer

**File:** `app/client/schedule/ClientScheduleContent.tsx` – `handleDeclineOffer`

- Updates session_request to `cancelled`. No session exists yet; consistent.

### 2.7 Client submits availability

**File:** `app/client/schedule/ClientScheduleContent.tsx` – `handleSubmitAvailability`

- Updates session_request to `availability_submitted` and sets `availability_preferences`. No session yet; consistent.

### 2.8 Coach decline time request

**File:** `app/coach/schedule/page.tsx` – `handleDeclineTimeRequest`

- Updates client_time_request to `declined`. No session_request created; consistent.

---

## 3. Gaps and inconsistencies

### 3.1 Session deleted, session_request not reverted (medium)

**Where:** `app/coach/schedule/page.tsx` – `handleDeleteSession`

- **Behavior:** Deletes session; if the session had an `availability_slot_id`, deletes that slot. Does **not** update the related session_request.
- **Issue:** If the session was created from a session_request (has `session_request_id`), that session_request remains `scheduled` while the session no longer exists. UI and reporting can show “scheduled” with no session.
- **Recommendation:** When deleting a session that has `session_request_id`, update that session_request (e.g. back to `paid` or to a new status like `session_cancelled`) so offer state matches reality. Optionally keep a “cancelled” state on session_request for audit.

### 3.2 Session cancelled (coach), session_request not updated (medium)

**Where:** `app/coach/schedule/page.tsx` – `handleMarkCanceled`

- **Behavior:** Updates session to `status: 'cancelled'`. Does not touch the linked session_request.
- **Issue:** session_request stays `scheduled`; client may still see it as scheduled. Data model allows “cancelled session” but “scheduled offer.”
- **Recommendation:** When coach cancels a session that has `session_request_id`, update that session_request (e.g. to `cancelled` or a dedicated “session_cancelled”) so client and coach views align.

### 3.3 Client cancels session, session_request not updated (low–medium)

**Where:** `app/client/schedule/ClientScheduleContent.tsx` – `handleCancelSession`

- **Behavior:** Updates session to `status: 'cancelled'`. Does not update session_request.
- **Issue:** Same as 3.2: session_request remains `scheduled`.
- **Recommendation:** When session is cancelled (by client or coach), update the linked session_request to a cancelled state if present.

### 3.4 “Mark as paid” (session) does not create payment row (medium)

**Where:** `app/coach/schedule/page.tsx` – `handleMarkAsPaid`; `app/coach/clients/[id]/SessionHistoryWithPay.tsx` – `handleMarkAsPaid`

- **Behavior:** Only updates `sessions.paid_at`. No insert into `payments`.
- **Issue:** Revenue and payment history are derived from `payments`. Sessions marked as paid via this flow are invisible there; dashboard/analytics that sum from `payments` undercount. `sessions.paid_at` and `payments` can diverge.
- **Recommendation:** When marking a session as paid, also insert a row into `payments` (e.g. provider `other` or `recorded_manual`, with `session_id` and optionally `session_request_id` if the session has one) so all “paid” sessions are reflected in payments and reporting stays consistent.

### 3.5 Coach “book session” (direct) creates session without session_request_id (by design)

**Where:** `app/coach/schedule/page.tsx` – `handleBookSessionSubmit` when `!bookRequirePayment`

- **Behavior:** Inserts session with no `session_request_id`. No session_request is created.
- **Assessment:** Intentional for “free” or in-person booking. No integrity bug; session and session_requests are independent for this path.

### 3.6 Coach “book session” with “require payment” only creates offer (by design)

**Where:** `app/coach/schedule/page.tsx` – `handleBookSessionSubmit` when `bookRequirePayment`

- **Behavior:** Only inserts session_request (status `offered`). No session yet. Session is created later when client pays (or coach schedules from availability).
- **Assessment:** Correct; no inconsistency.

### 3.7 Manual payment recording not linked to session or offer (by design)

**Where:** `app/coach/payments/page.tsx` – `handleRecordPayment`

- **Behavior:** Inserts into `payments` with `payer_client_id`, amount, provider; no `session_request_id` or `session_id`.
- **Assessment:** Used for “I got paid outside the app.” Not tied to a specific session or offer by design. Optional improvement: allow attaching to a session so that session can be marked paid and the payment row linked.

### 3.8 Two-step flows without transactions

**Where:** Coach schedule – create session then update session_request to `scheduled`; Stripe webhook – create session then update session_request to `scheduled`.

- **Issue:** If the second step fails (or is not run), session_request and session can be out of sync. DB has no single transaction or trigger enforcing “session exists ⇒ session_request.scheduled.”
- **Recommendation:** Prefer a single transaction (e.g. server action or API route that does both in one Supabase transaction if available, or a DB function that creates session and updates session_request). Short term: ensure both steps are in the same handler and add retries or idempotent updates for the session_request status.

---

## 4. Summary table

| Area | Status | Notes |
|------|--------|--------|
| **Offer → payment → session (Stripe)** | OK | Payment insert, session_request → paid, then session insert + session_request → scheduled. Order correct; only risk is second update failure. |
| **Coach pick time (availability_submitted)** | OK | Session insert then session_request → scheduled. Same two-step risk. |
| **Client decline / submit availability** | OK | Only session_request updated; consistent. |
| **Coach offer from time request** | OK | session_request + client_time_request updated with link. |
| **Session deleted (coach)** | Gap | session_request not reverted; can stay `scheduled`. |
| **Session cancelled (coach or client)** | Gap | session_request not updated; can stay `scheduled`. |
| **Mark session as paid (UI)** | Gap | Only `sessions.paid_at`; no `payments` row; reporting undercounts. |
| **Balance payment (Stripe)** | OK | session_requests updated to paid; payment not linked to requests (schema). |
| **Create checkout** | OK | session_request → payment_pending. |

---

## 5. Recommendations (priority)

1. **High:** When a session is **deleted** or **cancelled** (coach or client), update the linked session_request (e.g. set status to `cancelled` or a dedicated value) when `session_request_id` is not null.
2. **High:** When **“Mark as paid”** is used for a session, insert a corresponding `payments` row (with `session_id`, optional `session_request_id`, provider e.g. `recorded_manual` or `other`) so revenue and payment history stay consistent.
3. **Medium:** Where session creation and session_request update to `scheduled` are two steps (coach schedule, Stripe webhook), run both in a single transaction or use a DB function to avoid partial success and add idempotent handling for the status update.
4. **Low:** Optionally allow manual “record payment” to attach to a session (and set that session’s `paid_at` and link `session_id` on the payment) for consistency between sessions and payments.

Implementing 1 and 2 would remove the main data integrity gaps; 3 would harden consistency under failure.
