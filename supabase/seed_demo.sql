-- Demo seed data for ClearPath coach demo (~2 months of activity)
--
-- BEFORE RUNNING:
-- 1. Create your coach user in Supabase: Authentication → Users → Add user (e.g. coach@demo.com)
-- 2. Insert the coach profile (if not auto-created) with that user's id and tenant_id = 'demo'
-- 3. Copy the coach user's UUID and replace EVERY occurrence of YOUR_COACH_UUID_HERE below with it
-- 4. For dashboard revenue and tenant-scoped data to show, set NEXT_PUBLIC_CLIENT_ID=demo when running the app
--    (or replace every 'demo' below with your tenant id)
-- 5. Run this entire file in the Supabase SQL Editor

-- ========== CLIENTS (8) ==========
INSERT INTO public.clients (id, coach_id, client_id, full_name, email, phone, notes)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'YOUR_COACH_UUID_HERE', 'demo', 'Jordan Lee', 'jordan.lee@example.com', '555-0101', 'Prefers morning sessions. Working on combos.'),
  ('a1000000-0000-4000-8000-000000000002', 'YOUR_COACH_UUID_HERE', 'demo', 'Sam Rivera', 'sam.rivera@example.com', '555-0102', 'Competition prep. Heavy bag focus.'),
  ('a1000000-0000-4000-8000-000000000003', 'YOUR_COACH_UUID_HERE', 'demo', 'Alex Chen', 'alex.chen@example.com', '555-0103', 'New to kickboxing. Building fundamentals.'),
  ('a1000000-0000-4000-8000-000000000004', 'YOUR_COACH_UUID_HERE', 'demo', 'Morgan Taylor', 'morgan.taylor@example.com', '555-0104', 'Intermediate. Interested in sparring.'),
  ('a1000000-0000-4000-8000-000000000005', 'YOUR_COACH_UUID_HERE', 'demo', 'Casey Davis', 'casey.davis@example.com', '555-0105', 'Evening availability only.'),
  ('a1000000-0000-4000-8000-000000000006', 'YOUR_COACH_UUID_HERE', 'demo', 'Riley Brown', 'riley.brown@example.com', '555-0106', 'Returning after break.'),
  ('a1000000-0000-4000-8000-000000000007', 'YOUR_COACH_UUID_HERE', 'demo', 'Jamie Kim', 'jamie.kim@example.com', '555-0107', 'Goals: conditioning and technique.'),
  ('a1000000-0000-4000-8000-000000000008', 'YOUR_COACH_UUID_HERE', 'demo', 'Quinn Wilson', 'quinn.wilson@example.com', '555-0108', 'Weekend slots preferred.')
ON CONFLICT (id) DO UPDATE SET client_id = EXCLUDED.client_id, full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone, notes = EXCLUDED.notes;

-- ========== VIDEOS (4) ==========
INSERT INTO public.videos (id, coach_id, client_id, title, description, url, category)
VALUES
  ('b2000000-0000-4000-8000-000000000001', 'YOUR_COACH_UUID_HERE', 'demo', 'Warm-up routine', '5 min dynamic stretch', 'https://example.com/videos/warmup', 'warmup'),
  ('b2000000-0000-4000-8000-000000000002', 'YOUR_COACH_UUID_HERE', 'demo', 'Jab-cross combo', 'Basics and drills', 'https://example.com/videos/jab-cross', 'technique'),
  ('b2000000-0000-4000-8000-000000000003', 'YOUR_COACH_UUID_HERE', 'demo', 'Heavy bag round', 'Power and endurance', 'https://example.com/videos/heavy-bag', 'conditioning'),
  ('b2000000-0000-4000-8000-000000000004', 'YOUR_COACH_UUID_HERE', 'demo', 'Cool-down stretch', 'Post-session recovery', 'https://example.com/videos/cooldown', 'recovery')
ON CONFLICT (id) DO NOTHING;

-- ========== PROGRAMS (3) ==========
INSERT INTO public.programs (id, coach_id, client_id, name, description)
VALUES
  ('c3000000-0000-4000-8000-000000000001', 'YOUR_COACH_UUID_HERE', 'demo', 'Kickboxing fundamentals', 'First 8 weeks: stance, basic combos, conditioning.'),
  ('c3000000-0000-4000-8000-000000000002', 'YOUR_COACH_UUID_HERE', 'demo', 'Competition prep', 'Sparring and fight-ready conditioning.'),
  ('c3000000-0000-4000-8000-000000000003', 'YOUR_COACH_UUID_HERE', 'demo', 'Maintenance program', 'Ongoing technique and fitness.')
ON CONFLICT (id) DO NOTHING;

-- ========== PROGRAM_LESSONS (video-only; base schema has program_id, video_id, sort_order) ==========
-- If you have run migration 20240106 (program_lessons_multi_type), you can add link/note lessons manually.
INSERT INTO public.program_lessons (program_id, video_id, sort_order)
VALUES
  ('c3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001', 0),
  ('c3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000002', 1),
  ('c3000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000002', 0),
  ('c3000000-0000-4000-8000-000000000002', 'b2000000-0000-4000-8000-000000000003', 1),
  ('c3000000-0000-4000-8000-000000000003', 'b2000000-0000-4000-8000-000000000001', 0)
ON CONFLICT (program_id, video_id) DO NOTHING;

-- ========== PROGRAM_ASSIGNMENTS ==========
INSERT INTO public.program_assignments (program_id, client_id)
VALUES
  ('c3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('c3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002'),
  ('c3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002'),
  ('c3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000003'),
  ('c3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000004'),
  ('c3000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000005')
ON CONFLICT (program_id, client_id) DO NOTHING;

-- ========== VIDEO_ASSIGNMENTS (sample) ==========
INSERT INTO public.video_assignments (video_id, client_id)
VALUES
  ('b2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002'),
  ('b2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003')
ON CONFLICT (video_id, client_id) DO NOTHING;

-- ========== SESSION_PRODUCTS (3) ==========
INSERT INTO public.session_products (id, coach_id, client_id, name, description, duration_minutes, price_cents, max_participants)
VALUES
  ('d4000000-0000-4000-8000-000000000001', 'YOUR_COACH_UUID_HERE', 'demo', 'Single 45-min session', 'One-on-one private session', 45, 7500, 1),
  ('d4000000-0000-4000-8000-000000000002', 'YOUR_COACH_UUID_HERE', 'demo', 'Pack of 5 sessions', 'Save with a 5-pack', 45, 35000, 1),
  ('d4000000-0000-4000-8000-000000000003', 'YOUR_COACH_UUID_HERE', 'demo', 'Group session', 'Small group 60 min', 60, 2500, 6)
ON CONFLICT (id) DO NOTHING;

-- ========== AVAILABILITY SLOTS (past 8 weeks + next 2 weeks, ~3 per week) ==========
INSERT INTO public.availability_slots (coach_id, client_id, start_time, end_time, is_group_session, max_participants)
SELECT
  'YOUR_COACH_UUID_HERE'::uuid,
  'demo',
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval + '09:00'::interval)::timestamptz,
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval + '10:00'::interval)::timestamptz,
  false,
  1
FROM generate_series(0, 9) AS n,
     generate_series(0, 2) AS slot
WHERE (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval) >= (NOW() - interval '8 weeks')
  AND (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval) <= (NOW() + interval '2 weeks');

-- ========== SESSIONS (past ~2 months: completed/cancelled; next 2 weeks: confirmed/pending) ==========
-- Past completed (one per week for 8 weeks, various clients)
INSERT INTO public.sessions (coach_id, client_id, tenant_id, availability_slot_id, scheduled_time, status, notes, amount_cents)
SELECT
  'YOUR_COACH_UUID_HERE'::uuid,
  (ARRAY['a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000005','a1000000-0000-4000-8000-000000000001'])[1 + (n % 8)]::uuid,
  'demo',
  (SELECT id FROM public.availability_slots WHERE coach_id = 'YOUR_COACH_UUID_HERE'::uuid AND start_time < NOW() ORDER BY start_time ASC LIMIT 1 OFFSET n),
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + '09:00'::interval)::timestamptz,
  'completed',
  'Session completed.',
  7500
FROM generate_series(0, 7) AS n;

-- Past cancelled (a few)
INSERT INTO public.sessions (coach_id, client_id, tenant_id, availability_slot_id, scheduled_time, status, notes)
SELECT
  'YOUR_COACH_UUID_HERE'::uuid,
  'a1000000-0000-4000-8000-000000000003'::uuid,
  'demo',
  NULL,
  (date_trunc('week', NOW() - interval '4 weeks') + '14:00'::interval)::timestamptz,
  'cancelled',
  'Client no-show'
WHERE EXISTS (SELECT 1 FROM public.availability_slots WHERE coach_id = 'YOUR_COACH_UUID_HERE'::uuid LIMIT 1);

-- Upcoming confirmed (next 7 days reusing slots)
INSERT INTO public.sessions (coach_id, client_id, tenant_id, availability_slot_id, scheduled_time, status, notes)
SELECT
  'YOUR_COACH_UUID_HERE'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'demo',
  (SELECT id FROM public.availability_slots WHERE coach_id = 'YOUR_COACH_UUID_HERE'::uuid AND start_time >= NOW() ORDER BY start_time ASC LIMIT 1 OFFSET 0),
  (date_trunc('day', NOW()) + '1 day'::interval + '09:00'::interval)::timestamptz,
  'confirmed',
  'Private lesson - combos';

INSERT INTO public.sessions (coach_id, client_id, tenant_id, availability_slot_id, scheduled_time, status, notes)
SELECT
  'YOUR_COACH_UUID_HERE'::uuid,
  'a1000000-0000-4000-8000-000000000002'::uuid,
  'demo',
  (SELECT id FROM public.availability_slots WHERE coach_id = 'YOUR_COACH_UUID_HERE'::uuid AND start_time >= NOW() ORDER BY start_time ASC LIMIT 1 OFFSET 1),
  (date_trunc('day', NOW()) + '2 days'::interval + '09:00'::interval)::timestamptz,
  'confirmed',
  NULL;

INSERT INTO public.sessions (coach_id, client_id, tenant_id, availability_slot_id, scheduled_time, status, notes)
VALUES
  ('YOUR_COACH_UUID_HERE'::uuid, 'a1000000-0000-4000-8000-000000000003'::uuid, 'demo', NULL,
   (date_trunc('day', NOW()) + '3 days'::interval + '14:00'::interval)::timestamptz,
   'pending', 'Requested by client');

-- ========== SESSION_REQUESTS (mixed statuses) ==========
INSERT INTO public.session_requests (id, coach_id, client_id, session_product_id, tenant_id, status, amount_cents)
VALUES
  ('e5000000-0000-4000-8000-000000000001', 'YOUR_COACH_UUID_HERE', 'a1000000-0000-4000-8000-000000000004', 'd4000000-0000-4000-8000-000000000001', 'demo', 'offered', 7500),
  ('e5000000-0000-4000-8000-000000000002', 'YOUR_COACH_UUID_HERE', 'a1000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000002', 'demo', 'paid', 35000),
  ('e5000000-0000-4000-8000-000000000003', 'YOUR_COACH_UUID_HERE', 'a1000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000001', 'demo', 'scheduled', 7500),
  ('e5000000-0000-4000-8000-000000000004', 'YOUR_COACH_UUID_HERE', 'a1000000-0000-4000-8000-000000000005', 'd4000000-0000-4000-8000-000000000001', 'demo', 'cancelled', 7500)
ON CONFLICT (id) DO NOTHING;

-- ========== PAYMENTS (past 8 weeks so revenue charts show data) ==========
INSERT INTO public.payments (coach_id, client_id, amount_cents, currency, status, provider, created_at)
SELECT
  'YOUR_COACH_UUID_HERE'::uuid,
  'demo',
  7500,
  'usd',
  'succeeded',
  'stripe',
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + '12:00'::interval)::timestamptz
FROM generate_series(0, 7) AS n;

INSERT INTO public.payments (coach_id, client_id, amount_cents, currency, status, provider, created_at)
VALUES
  ('YOUR_COACH_UUID_HERE'::uuid, 'demo', 35000, 'usd', 'succeeded', 'stripe', (NOW() - interval '2 weeks')::timestamptz),
  ('YOUR_COACH_UUID_HERE'::uuid, 'demo', 7500, 'usd', 'recorded_manual', 'other', (NOW() - interval '5 days')::timestamptz);

-- ========== MESSAGES (3 unread; include client_id for tenant) ==========
-- Messages: run once; duplicate sends if seed is re-run
INSERT INTO public.messages (sender_id, recipient_id, client_id, content, read_at)
VALUES
  ('YOUR_COACH_UUID_HERE', 'YOUR_COACH_UUID_HERE', 'demo', 'Hey, can we move our session to 3pm instead?', NULL),
  ('YOUR_COACH_UUID_HERE', 'YOUR_COACH_UUID_HERE', 'demo', 'Thanks for the workout plan! When is the next slot?', NULL),
  ('YOUR_COACH_UUID_HERE', 'YOUR_COACH_UUID_HERE', 'demo', 'Running 10 min late today, see you soon.', NULL);
