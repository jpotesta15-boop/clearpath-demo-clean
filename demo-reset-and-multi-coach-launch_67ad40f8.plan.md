## Build Plan: Demo Reset & Multi‑Coach Launch

This plan outlines the work needed to:

- **(A) Demo reset** – make it easy to reset the **demo tenant** to a clean, realistic state between demos.
- **(B) Multi‑coach launch** – support multiple coach deployments (whitelabel / reseller) using the existing tenant + branding model.

It is designed to align with existing decisions and docs like `DEPLOY_CHECKLIST.md`, `WHITELABEL_RESELLER.md`, and the design system/motion tokens.

---

## A. Demo Reset

### A1. Define demo tenant contract

- **Goal:** Make the demo environment predictable by formalizing which tenant is “demo” and which data should exist after a reset.
- **Decisions:**
  - Use a **dedicated tenant id** for demo, e.g. `demo` (matches `NEXT_PUBLIC_CLIENT_ID=demo` when running in demo mode).
  - Use `NEXT_PUBLIC_DEMO_MODE=true` to:
    - Show demo login helpers (demo coach + demo client credentials) on the auth screen.
    - Hide or disable any destructive admin-only controls that would break the demo.
  - Demo tenant data should:
    - Include **one primary coach** with connected Stripe (fake or test-mode).
    - Include **a few sample clients**, programs, session packages, and scheduled/past sessions.
    - Include **sample payments**, videos, and analytics rows, enough to make dashboards feel alive.

**Deliverables**

- Short doc section in `DEPLOY_CHECKLIST.md` or a new `docs/DEMO_ENVIRONMENT.md` describing:
  - The demo tenant id (`demo`).
  - Required environment variables and Supabase rows for a “healthy” demo.

---

### A2. Seed script for demo tenant

- **Goal:** Provide a repeatable script that can **wipe and reseed** demo data for the `demo` tenant.
- **Approach:**
  - Reuse or adapt existing SQL like `supabase/seed_full_using_existing.sql` to:
    - Delete tenant-scoped data for `tenant_id = 'demo'` in key tables:
      - `profiles`, `clients`, `programs`, `videos`, `session_packages`, `session_requests`, `sessions`, payments tables, etc.
    - Re‑insert:
      - Demo coach profile and auth user (optionally just profile, assuming auth user already exists).
      - Demo clients.
      - Session packages + offers in various states (pending, accepted, completed).
      - A handful of sessions across past and future dates.
  - Wrap SQL in a **Supabase migration‑style script** or a separate `.sql` file invoked via:
    - `supabase db execute --file supabase/seed_demo_tenant.sql`
    - Or a Node/TS script that calls Supabase with service role key and runs the SQL.

**Deliverables**

- `supabase/seed_demo_tenant.sql` (or similar) that:
  - Clears demo tenant data (idempotent).
  - Inserts a realistic demo dataset.
- Optional helper script:
  - `scripts/reset-demo.ps1` and/or `scripts/reset-demo.sh` to run the SQL against the configured Supabase project.

---

### A3. “Reset demo” operational path

- **Goal:** Give humans a reliable way to trigger a reset before or after a demo.
- **Options (pick 1 now, maybe both later):**
  1. **CLI‑only path (MVP):**
     - Document a single command (PowerShell + Bash) that:
       - Loads `.env.local` or a `.env.demo` file.
       - Calls Supabase CLI / psql to run `seed_demo_tenant.sql`.
     - Add a short “How to reset the demo” section to the demo docs.
  2. **Admin‑only web endpoint (future):**
     - Protected API route (e.g. `/api/admin/reset-demo`) that:
       - Verifies a secret header or a special user role.
       - Calls the same SQL (via Supabase service role) to reset the demo tenant.
     - Hidden behind feature flag; not exposed in production for real tenants.

**Deliverables**

- Documented **reset procedure** in `docs/DEMO_ENVIRONMENT.md` (or similar), including:
  - Commands for Windows (PowerShell) and Mac/Linux.
  - Warnings about using it only against the demo project/tenant.

---

### A4. Demo UX polish

- **Goal:** Ensure the app clearly communicates that this is a **demo** and doesn’t leak demo‑only helpers into real tenants.
- **Changes:**
  - In the login / landing UI:
    - When `NEXT_PUBLIC_DEMO_MODE=true`, show:
      - Demo coach + demo client email/password examples.
      - A short note: “This is a demo environment. Data resets regularly.”
    - When `NEXT_PUBLIC_DEMO_MODE` is not set, hide all demo‑only hints.
  - Optional banner on dashboard pages (`client` + `coach`) when in demo mode:
    - Non‑intrusive top or bottom bar: “Demo mode – data may reset and is not private.”

**Deliverables**

- Small UI tweaks gated by `NEXT_PUBLIC_DEMO_MODE`.
- Short copy review to keep demo messaging clear but non‑scary.

---

## B. Multi‑Coach Launch (Whitelabel / Reseller)

### B1. Harden whitelabel configuration

- **Goal:** Make per‑coach configuration predictable, minimal, and well‑documented.
- **Reference:** `docs/WHITELABEL_RESELLER.md`
- **Tasks:**
  - Confirm or add support for `client-config.json` at project root with fields:
    - `clientName`, `businessName`, `supabaseClientId`, `brandColors.primary`, `brandColors.secondary`, `logo`, `features.*`.
  - Ensure that, when `client-config.json` is present:
    - It **overrides** `NEXT_PUBLIC_CLIENT_*` env vars in the UI layer (branding + copy).
    - `supabaseClientId` maps to `tenant_id` for newly created users (first signup sets the coach’s tenant id).
  - Add validation / safe defaults:
    - If config is missing required fields, log a **clear error** in dev and fall back to env vars.

**Deliverables**

- Verified config loading utility (or new helper) that merges `client-config.json` with env vars.
- Updated docs with a **minimal example config** and explanation of overrides.

---

### B2. Coach setup automation scripts

- **Goal:** Make it trivial to spin up a new coach deployment from a terminal.
- **Reference:** `scripts/setup-coach.ps1`, `scripts/setup-coach.sh`
- **Tasks:**
  - Ensure both scripts:
    - Accept slug, display name, and brand colors.
    - Generate `client-config.json` in the project root.
  - Optionally, have scripts:
    - Print **next steps** after generation:
      - “Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.”
      - “Set `NEXT_PUBLIC_CLIENT_ID` to match `supabaseClientId`.”
      - “Create or verify coach profile in Supabase with `tenant_id = <slug>`.”

**Deliverables**

- Polished setup scripts that are consistent across PowerShell and Bash.
- Short usage docs in `WHITELABEL_RESELLER.md` (already partially present; update as needed).

---

### B3. Per‑coach deployment pattern

- **Goal:** Define and document the **recommended deployment strategy** for multiple coaches.
- **Reference:** `WHITELABEL_RESELLER.md`, `DEPLOY_CHECKLIST.md`
- **Strategy (baseline):**
  - **One Vercel project per coach** (simplest mental model):
    - All projects point to the same Supabase backend.
    - Each project has its own:
      - `NEXT_PUBLIC_CLIENT_ID` (tenant id).
      - Branding env vars or `client-config.json` baked into the repo.
      - Stripe keys and webhook (per coach) if needed.
  - Optionally document how to use:
    - Single repo + multiple Vercel projects.
    - Preview deployments per coach (less common, but possible).

**Deliverables**

- A “Multi‑coach deployment” section that:
  - Lists required env vars (per coach).
  - Shows an example Vercel project configuration.
  - Mentions how to add Supabase redirect URLs for each custom domain.

---

### B4. Tenant isolation and UX checks

- **Goal:** Confirm that all coach‑facing and client‑facing views respect `tenant_id` and show only tenant‑scoped data.
- **Tasks:**
  - Spot‑check key paths (`coach` + `client`):
    - Dashboards, schedule, clients list, programs, videos, session packages, payments, analytics.
  - Verify RLS policies (via existing migrations) enforce:
    - `tenant_id` match on read/write operations.
  - Ensure no hard‑coded tenant ids remain from earlier demos (e.g. `demo` or a specific UUID).

**Deliverables**

- Checklist in `WHITELABEL_RESELLER.md` or a new QA doc:
  - “When adding a new coach, verify these flows show only that coach’s data.”

---

## C. QA & Launch Checklist

### C1. Demo reset QA

- Run the demo reset script against a staging/demo environment:
  - Verify:
    - Demo coach can log in.
    - Demo clients exist and can log in (or be impersonated).
    - Dashboards, schedule, programs, videos, and payments all show sane sample data.
  - Trigger reset again:
    - Confirm it is **idempotent** (no duplicate seed data, no errors).

---

### C2. Multi‑coach QA

- Set up **at least two** coaches:
  - `coach-alpha` and `coach-bravo` with distinct branding and domains.
- For each:
  - Confirm:
    - Signup and login flows work.
    - Clients belong only to that coach’s tenant.
    - Session offers, payments, and videos are scoped correctly.
  - Cross‑check:
    - Logging into coach A never reveals data from coach B, and vice versa.

---

### C3. Final sign‑off

- Update `DEPLOY_CHECKLIST.md` and/or `WHITELABEL_RESELLER.md` with:
  - Demo reset steps.
  - Multi‑coach deployment pattern.
- Optionally add a small section to `PRODUCTION_READINESS_REVIEW.md` (if present) noting:
  - “Demo reset automation in place.”
  - “Multi‑coach (whitelabel) deployment documented and tested.”

After these steps, you should be able to:

- Quickly **reset the demo** to a clean, impressive state before any sales call.
- Confidently **launch new coaches** as whitelabel tenants sharing the same Supabase project while keeping data isolated and branding distinct.

