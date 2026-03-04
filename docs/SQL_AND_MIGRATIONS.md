# SQL and migrations

This doc is the single runbook for schema (migrations) and data (seeds) so everything stays organized and applies in the right order.

## Rule: repo is the source of truth

All **schema** (tables, columns, RLS, triggers, functions) lives in `supabase/migrations/` and is applied **in filename order** (oldest first). Do not make schema changes via one-off SQL in the Supabase Dashboard unless you later add the same change to a new migration file and commit it.

**Apply method:** Either (a) **Supabase CLI:** `supabase db push`, or (b) **Manual:** Run each migration file in the Supabase SQL Editor in the order below.

---

## Migration run order

Run these in order (alphabetical by filename = correct order):

| Order | File | Purpose |
|-------|------|--------|
| 1 | `20240101000000_initial_schema.sql` | Tables: profiles, clients, programs, program_assignments, videos, video_assignments, availability_slots, sessions, messages, activity_log; basic RLS |
| 2 | `20240102000000_add_tenant_isolation.sql` | Adds `tenant_id`/`client_id` columns; `get_current_client_id()`; tenant-scoped RLS |
| 3 | `20240103000000_program_lessons.sql` | program_lessons table |
| 4 | `20240104000000_add_sessions_paid_at.sql` | sessions.paid_at |
| 5 | `20240105000000_sessions_tenant_id.sql` | sessions.tenant_id |
| 6 | `20240106000000_program_lessons_multi_type.sql` | program_lessons type/url/notes |
| 7 | `20240107000000_handle_new_user.sql` | Trigger: create profile on auth signup |
| 8 | `20240108000000_coach_video_assignments.sql` | Video assignment RLS for coaches |
| 9 | `20240109000000_session_packages_payments_videos.sql` | session_products, session_requests, payments; session FKs |
| 10 | `20240110000000_stripe_connect_profiles.sql` | Stripe-related columns on profiles |
| 11 | `20240111000000_coach_preferences_profiles.sql` | Coach preferences on profiles |
| 12 | `20240112000000_handle_new_user_tenant_id.sql` | handle_new_user sets profile.tenant_id from metadata |

**Seeds are not migrations.** Run `supabase/seed_demo.sql` (or `supabase/seed.sql`) **after** all migrations. See [SEED_DEMO.md](SEED_DEMO.md).

---

## Fresh project

1. **Apply migrations** in order: run all 12 files from `supabase/migrations/` (CLI: `supabase db push`, or paste each file into SQL Editor and run).
2. **Create coach user** in Supabase: Authentication → Users → Add user (e.g. `coach@demo.com`).
3. **Ensure coach profile** exists with `role = 'coach'` and `tenant_id = 'demo'` (or your tenant).
4. **Run seed:** Open `supabase/seed_demo.sql`, replace every `YOUR_COACH_UUID_HERE` with the coach user UUID, then run the file in SQL Editor.
5. Set **`NEXT_PUBLIC_CLIENT_ID=demo`** (or your tenant) in env.

---

## Reset database and re-apply migrations (clean slate)

If the remote database already has schema and you want to clear it and re-apply all migrations from the repo:

1. **Reset the database** (only in Supabase Dashboard; the CLI cannot reset a remote DB):
   - Go to [app.supabase.com](https://app.supabase.com) → your project.
   - **Project Settings** (gear) → **Database**.
   - Under **Danger zone** (or similar), click **Reset database**. Confirm. This deletes all data and schema.

2. **Re-apply migrations** from the project folder:
   ```bash
   supabase db push
   ```
   When prompted "Do you want to push these migrations?", type **Y** and Enter. Or run:
   ```bash
   echo Y | supabase db push
   ```
   to confirm automatically.

3. **Re-create coach user** in Authentication → Users (and ensure their `profiles` row has `role = 'coach'` and `tenant_id = 'demo'`), then run `supabase/seed_demo.sql` in the SQL Editor if you want demo data.

**Alternative: clear public schema without full DB reset**  
If "Reset database" didn't remove tables (or you prefer not to reset), run the script **`supabase/clean_public_schema.sql`** in the Supabase SQL Editor. It drops all tables in the `public` schema. Then run `supabase db push` from the project folder.

---

## Existing project (DB already has schema from ad-hoc SQL)

- Check **Supabase Dashboard → Database → Migrations** (or table `supabase_migrations.schema_migrations` if using CLI) to see what’s recorded.
- If the DB was built from one-off scripts: for a **new** environment, run only the repo migrations in order, then seed. For the **current** DB, you can (a) treat the repo as desired state and add a **new** migration that applies any missing pieces (use `IF NOT EXISTS` / `OR REPLACE` so it’s safe), or (b) dump the current schema (`supabase db dump --schema public`) and diff against the repo to find gaps, then add one migration that fills those gaps.

---

## Adding a new schema change

1. Create a new file: `supabase/migrations/YYYYMMDDHHMMSS_short_name.sql` (e.g. `20240115120000_add_my_feature.sql`).
2. Use idempotent SQL: `CREATE OR REPLACE`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` then `CREATE POLICY`, etc.
3. Run it via CLI (`supabase db push`) or by pasting into SQL Editor.
4. Commit the file so the repo stays in sync with the DB.

This keeps schema changes in one place and avoids “private” one-off scripts that are never reflected in the repo.

---

## Canonical paths

- Migrations: `supabase/migrations/` (exactly 12 files as listed above).
- Seeds: `supabase/seed_demo.sql`, `supabase/seed.sql`. There should be only one copy of each file; use these paths as canonical.
