# Error Handling Audit

This document summarizes the error-handling audit and the improvements made so that critical user actions have clear feedback, safe API behavior, and where appropriate a path to retry.

## Summary of Changes

### 1. API / Stripe

- **`/api/stripe/create-checkout-session`**  
  - Wrapped Stripe `checkout.sessions.create` in try/catch.  
  - Returns 429 for rate limits and 502 with a safe message for other Stripe errors.  
  - Avoids unhandled exceptions and exposes only safe, user-facing messages.

- **`/api/stripe/connect/account-link`**  
  - Wrapped Stripe `accounts.create` and `accountLinks.create` in try/catch.  
  - Returns 502 with a safe message on failure.  
  - Handles missing `url` in the response.

- **`/api/stripe/request-payment`**  
  - Wrapped Stripe `checkout.sessions.create` in try/catch.  
  - Returns 502 with a safe message on failure.  
  - Handles missing `url` in the response.

### 2. Dashboard

- **Connect Stripe**  
  - Added catch for `fetch` (e.g. network errors).  
  - User sees: "Network error. Please check your connection and try again."  
  - Handles missing `data.url` with a clear message.  
  - Loading state is always cleared in `finally`.

### 3. New Client

- **Add client form**  
  - Entire submit flow wrapped in try/catch/finally.  
  - `setSaving(false)` always runs.  
  - On catch, user sees: "Something went wrong. Please try again."  
  - API error messages (invite / create-account) are shown with a fallback.

### 4. Request Payment (client detail)

- **Copy payment link**  
  - Replaced `alert()` with inline error state.  
  - Added catch for `fetch` (network errors).  
  - User sees inline error and can retry by clicking again.

### 5. Delete Client

- **Delete client action**  
  - Wrapped `deleteClientAction()` in try/catch/finally.  
  - `setDeleting(false)` always runs.  
  - On throw (e.g. network), user sees: "Something went wrong. Please try again."

### 6. Coach Schedule

- **Edit session modal**  
  - New `editModalError` state.  
  - Shown for: save edit, delete session, mark completed, mark canceled, approve session, mark as paid.  
  - Messages: "Could not save/delete/mark… Please try again."

- **Offer from time request**  
  - New `offerError` state when session_requests insert fails.  
  - Shown in the offer modal; cleared on cancel/close.

- **Book session**  
  - New `bookError` state when session or session_request insert fails.  
  - Shown in the book-session card; cleared on close/cancel.

- **Send reminder**  
  - Already had `reminderError` and try/catch; no change.

### 7. Programs – Who has access

- **Add access**  
  - New `assignError` state when `program_assignments` upsert fails.  
  - User sees: "Could not add access. Please try again."  
  - Can retry by selecting a client and clicking Add access again.

### 8. Client Messages

- **Send message**  
  - New `sendError` state when message insert fails.  
  - User sees: "Failed to send. Please try again."  
  - Can retry by sending again.

- **Submit availability**  
  - New `availabilityError` state when session_requests update fails.  
  - Shown in the availability modal; cleared on cancel/close.

## Existing Good Patterns (unchanged)

- **`app/error.tsx`** and **`app/global-error.tsx`**  
  - Provide a top-level "Something went wrong" and "Try again" (reset).

- **`lib/api-error.ts`**  
  - Centralized safe messages and server-side logging.

- **Invite-client and create-client-account APIs**  
  - Validate input, return structured errors, rate limit (invite), and use try/catch where needed.

- **Send-reminder API**  
  - Try/catch around external fetch and safe 502 responses.

- **Coach messages page**  
  - Already shows `sendError` and handles mark-as-read and unread counts.

## Retry

- **Retry** is implicit for all updated flows: the user can repeat the action (e.g. click "Add access", "Copy payment link", "Send", "Save changes") after seeing the error.  
- No dedicated "Retry" button was added; the primary action button serves as retry.

## Not Covered in This Pass

- Network timeouts (e.g. `AbortController` + timeout) on fetch.  
- Optimistic UI rollback on mutation failure (data is refetched where applicable).  
- Toast or global notification system (errors are inline per flow).  
- Permission errors from Supabase RLS (often surface as 403 or failed mutation; messages are generic "Please try again" where needed).

## Recommendations

1. Consider a small toast or banner for transient errors so users see feedback even when the form is scrolled away.  
2. For critical payment flows, consider idempotency keys or explicit retry guidance if Stripe returns a retryable error.  
3. Optionally add `AbortSignal` with a timeout (e.g. 15–30s) for long-running API calls and show a timeout-specific message.
