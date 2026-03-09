## Demo Environment – ClearPath Coach OS

Use this guide to keep the demo tenant clean, realistic, and easy to reset between demos.

---

## 1. Demo tenant contract

- **Tenant id:** `demo` (set via `NEXT_PUBLIC_CLIENT_ID=demo` in `.env.local` or hosting env).
- **Supabase project:** Same project as production/staging, but demo data is scoped by:
  - `profiles.tenant_id = 'demo'` for demo coach and clients.
  - `client_id = 'demo'` or `tenant_id = 'demo'` on tenant tables (`clients`, `programs`, `videos`, `sessions`, `session_requests`, `payments`, etc.).
- **Demo mode flag:**  
  - `NEXT_PUBLIC_DEMO_MODE=true` → show demo credentials on the login page (`app/login/page.tsx`) and optional demo-only messaging.
  - Omit or set to `false` in real coach deployments.

Target experience after a fresh seed:

- One **demo coach** with a full dashboard (revenue, sessions, clients).
- Several **demo clients** with:
  - Assigned programs and videos.
  - A mix of **past sessions**, **upcoming sessions**, and **open offers**.
  - Messages in their inbox and a coach daily message on the dashboard.

---

## 2. Reset + reseed workflow (recommended)

When the demo tenant starts to feel messy, reset it and reseed from scratch.

### Option A: Supabase SQL Editor (no CLI)

1. Open Supabase **SQL Editor** for your project.
2. Run `supabase/reset_demo_tenant.sql`:
   - Copy the contents of `supabase/reset_demo_tenant.sql` into a new SQL query.
   - Make sure the `demo_tenant` variable is `'demo'` (or your demo tenant id).
   - Click **Run** to clear tenant-scoped demo data.
3. Run `supabase/seed_full_using_existing.sql`:
   - Copy the contents of `supabase/seed_full_using_existing.sql` into a new SQL query.
   - This script uses your existing **demo coach** and **demo clients** (no placeholders) to:
     - Add session products, videos, and programs.
     - Create availability slots.
     - Seed ~2 months of sessions, payments, and messages.

After both scripts complete, reload the app (with `NEXT_PUBLIC_CLIENT_ID=demo`) and verify:

- Coach dashboard shows revenue and activity.
- Client dashboards show next session, offers, programs, and videos.

### Option B: Local reset script (Supabase CLI)

If you have the Supabase CLI installed and this repo checked out locally:

1. From the repo root, run **PowerShell (Windows)**:
   ```powershell
   .\scripts\reset-demo.ps1
   ```
2. Or **Bash (Mac/Linux)**:
   ```bash
   ./scripts/reset-demo.sh
   ```

These scripts:

1. Execute `supabase/reset_demo_tenant.sql` to clear tenant-scoped demo data.
2. Execute `supabase/seed_full_using_existing.sql` to reseed the demo tenant.

Make sure your Supabase CLI is authenticated and pointing at the correct project before running.

---

## 3. Demo credentials and UI hints

- **Env flags:**
  - `NEXT_PUBLIC_CLIENT_ID=demo`
  - `NEXT_PUBLIC_DEMO_MODE=true`
- **Login page (`app/login/page.tsx`):**
  - When `NEXT_PUBLIC_DEMO_MODE==='true'`, the login form shows a **“Demo credentials”** toggle with:
    - `coach@demo.com / demo123` (adjust in code if you use different demo users).
- Optional banner (future): add a small non-intrusive banner on coach and client dashboards:
  - “Demo mode – data may reset and is not private.”

---

## 4. QA checklist for demo resets

After running a reset + reseed, spot-check:

- **Coach**
  - Can log in to `/coach/dashboard`.
  - Sees realistic revenue and session counts.
  - Has multiple clients, programs, videos, and session packages.
  - Can navigate Schedule, Clients, Programs, Videos, Session Packages, and Payments without errors.
- **Client**
  - Can log in to `/client/dashboard`.
  - Sees next session (or clear empty state), any unpaid offers, and assigned programs/videos.
  - Schedule shows offers and upcoming sessions seeded by the scripts.

For a fuller flow checklist, see `docs/QA_TESTING_GUIDE.md`.

