# Demo seed data

This document describes how to run and customize the ClearPath demo seed (`supabase/seed_demo.sql`). **Run seeds only after all migrations have been applied.** See [SQL_AND_MIGRATIONS.md](SQL_AND_MIGRATIONS.md) for migration order and runbook.

## What the seed includes

- **Clients**: 8 clients with names, emails, phones, and notes (tenant `demo`).
- **Programs**: 3 programs with `program_lessons` (videos, links, notes).
- **Videos**: 4 coach videos (titles, URLs, categories).
- **Program assignments**: Clients assigned to programs.
- **Session products**: 3 products (single session, 5-pack, group).
- **Availability slots**: Past 8 weeks and next 2 weeks (~3 slots per week).
- **Sessions**: Past ~2 months (completed/cancelled) and upcoming (confirmed/pending), with `tenant_id`.
- **Session requests**: 4 requests in statuses offered, paid, scheduled, cancelled.
- **Payments**: Payments over the last 8 weeks so dashboard revenue and charts show data.
- **Messages**: 3 sample unread messages (coach-to-self for demo; see Messages below).

## Before running

1. **Apply all migrations** first (see [SQL_AND_MIGRATIONS.md](SQL_AND_MIGRATIONS.md)). Run seeds only after the schema is in place.
2. **Create the coach user** in Supabase: **Authentication → Users → Add user** (e.g. `coach@demo.com`).
3. **Ensure the coach profile exists** with `role = 'coach'` and `tenant_id = 'demo'` (create in **Table Editor → profiles** if not auto-created).
4. **Replace `YOUR_COACH_UUID_HERE`** in the seed file with the coach user’s UUID (from Authentication → Users). Use Find & Replace so every occurrence is updated.
5. **Tenant id**: The seed uses tenant/client_id `'demo'`. For the app to show this data (dashboard revenue, clients, etc.), set **`NEXT_PUBLIC_CLIENT_ID=demo`** in your env (or replace every `'demo'` in the seed with your tenant id).

## How to run

Run the entire `supabase/seed_demo.sql` file in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query → paste → Run). Replace every `YOUR_COACH_UUID_HERE` with your coach user UUID first.

**Already have a coach and clients?** Use **`supabase/seed_full_using_existing.sql`** instead: it uses your existing coach and clients (no placeholders), adds session products, videos, programs, availability, ~2 months of sessions and payments, and messages so the site looks full. Run once in the SQL Editor.

## Test as client

To test the app from the client’s point of view (no manual SQL):

1. Log in as coach.
2. Go to **Clients** → open a client that has an email (or add one).
3. Open **Client portal access** → **Create login** / **Generate password** → copy the password.
4. Log out, then log in with that client’s email and the generated password.

You should see the client dashboard. The app sets the user’s `profiles.tenant_id` on first load if it was missing, so RLS works without any manual SQL.

If you create a user manually in Supabase Auth, use an email that already exists in **Clients** for your coach (same tenant), or add that client in the app first. The first time that user logs in, the app will set their `tenant_id` so RLS works.

## Messages

The seed inserts 3 messages with `sender_id` and `recipient_id` both set to the coach (so they appear as unread for the coach). To seed **coach–client** messages you need Auth users (and profiles) for clients. Options:

- **SQL only**: Keep the current coach-to-self messages for demo, or leave messages unseeded.
- **Optional script**: Use the Supabase service role in a small Node/TS script to (1) create Auth users for each seeded client email, (2) create `profiles` with `role = 'client'`, (3) insert messages between coach and those client profile IDs. Run once after the SQL seed.

## Re-running the seed

- Most inserts use `ON CONFLICT ... DO NOTHING` or `DO UPDATE` so re-running is safe for clients, programs, videos, program_lessons, session_products, session_requests.
- **Messages** have no conflict target; re-running will add duplicate message rows.
- **Availability slots** and **sessions** are inserted without conflict handling; re-running adds more rows. Clear or truncate those tables first if you want a clean re-seed.
