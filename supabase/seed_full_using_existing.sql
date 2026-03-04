-- Fill the site with ~2 months of data using your EXISTING coach and clients.
-- Run in Supabase SQL Editor. No placeholders – uses (SELECT id FROM profiles WHERE role = 'coach') and your existing clients.
-- Safe to run once; re-running may add duplicate availability/sessions/messages (use ON CONFLICT where possible).

-- ========== SESSION PRODUCTS (3) – for your coach ==========
INSERT INTO public.session_products (coach_id, client_id, name, description, duration_minutes, price_cents, max_participants)
SELECT id, 'demo', 'Single 45-min session', 'One-on-one private session', 45, 7500, 1
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id)
WHERE NOT EXISTS (SELECT 1 FROM public.session_products sp WHERE sp.coach_id = coach.id AND sp.name = 'Single 45-min session');

INSERT INTO public.session_products (coach_id, client_id, name, description, duration_minutes, price_cents, max_participants)
SELECT id, 'demo', 'Pack of 5 sessions', 'Save with a 5-pack', 45, 35000, 1
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id)
WHERE NOT EXISTS (SELECT 1 FROM public.session_products sp WHERE sp.coach_id = coach.id AND sp.name = 'Pack of 5 sessions');

INSERT INTO public.session_products (coach_id, client_id, name, description, duration_minutes, price_cents, max_participants)
SELECT id, 'demo', 'Group session', 'Small group 60 min', 60, 2500, 6
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id)
WHERE NOT EXISTS (SELECT 1 FROM public.session_products sp WHERE sp.coach_id = coach.id AND sp.name = 'Group session');

-- ========== VIDEOS (4) – for your coach ==========
INSERT INTO public.videos (coach_id, client_id, title, description, url, category)
SELECT id, 'demo', 'Warm-up routine', '5 min dynamic stretch', 'https://example.com/videos/warmup', 'warmup'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

INSERT INTO public.videos (coach_id, client_id, title, description, url, category)
SELECT id, 'demo', 'Jab-cross combo', 'Basics and drills', 'https://example.com/videos/jab-cross', 'technique'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

INSERT INTO public.videos (coach_id, client_id, title, description, url, category)
SELECT id, 'demo', 'Heavy bag round', 'Power and endurance', 'https://example.com/videos/heavy-bag', 'conditioning'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

INSERT INTO public.videos (coach_id, client_id, title, description, url, category)
SELECT id, 'demo', 'Cool-down stretch', 'Post-session recovery', 'https://example.com/videos/cooldown', 'recovery'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

-- ========== PROGRAMS (3) ==========
INSERT INTO public.programs (coach_id, client_id, name, description)
SELECT id, 'demo', 'Kickboxing fundamentals', 'First 8 weeks: stance, basic combos, conditioning.'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

INSERT INTO public.programs (coach_id, client_id, name, description)
SELECT id, 'demo', 'Competition prep', 'Sparring and fight-ready conditioning.'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

INSERT INTO public.programs (coach_id, client_id, name, description)
SELECT id, 'demo', 'Maintenance program', 'Ongoing technique and fitness.'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

-- ========== PROGRAM_LESSONS (link programs to videos) ==========
INSERT INTO public.program_lessons (program_id, video_id, sort_order)
SELECT p.id, v.id, 0 FROM public.programs p, public.videos v WHERE p.client_id = 'demo' AND p.name = 'Kickboxing fundamentals' AND v.client_id = 'demo' AND v.title = 'Warm-up routine'
ON CONFLICT (program_id, video_id) DO NOTHING;
INSERT INTO public.program_lessons (program_id, video_id, sort_order)
SELECT p.id, v.id, 1 FROM public.programs p, public.videos v WHERE p.client_id = 'demo' AND p.name = 'Kickboxing fundamentals' AND v.client_id = 'demo' AND v.title = 'Jab-cross combo'
ON CONFLICT (program_id, video_id) DO NOTHING;
INSERT INTO public.program_lessons (program_id, video_id, sort_order)
SELECT p.id, v.id, 0 FROM public.programs p, public.videos v WHERE p.client_id = 'demo' AND p.name = 'Competition prep' AND v.client_id = 'demo' AND v.title = 'Heavy bag round'
ON CONFLICT (program_id, video_id) DO NOTHING;

-- ========== AVAILABILITY SLOTS (past 8 weeks + next 2 weeks, ~3 per week) ==========
INSERT INTO public.availability_slots (coach_id, client_id, start_time, end_time, is_group_session, max_participants)
SELECT
  p.id,
  'demo',
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval + '09:00'::interval)::timestamptz,
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval + '10:00'::interval)::timestamptz,
  false,
  1
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS p(id),
     generate_series(0, 9) AS n,
     generate_series(0, 2) AS slot
WHERE (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval) >= (NOW() - interval '8 weeks')
  AND (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (slot * 2 || ' days')::interval) <= (NOW() + interval '2 weeks');

-- ========== SESSIONS (past ~2 months completed + upcoming) – use existing clients ==========
-- Past completed: 8 weeks (one per week, first client)
INSERT INTO public.sessions (coach_id, client_id, tenant_id, scheduled_time, status, notes, amount_cents)
SELECT
  c.id,
  (SELECT id FROM public.clients WHERE client_id = 'demo' AND coach_id = c.id ORDER BY id LIMIT 1),
  'demo',
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + '09:00'::interval)::timestamptz,
  'completed',
  'Session completed.',
  7500
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS c(id),
     generate_series(0, 7) AS n
WHERE NOT EXISTS (SELECT 1 FROM public.sessions WHERE coach_id = c.id AND status = 'completed' LIMIT 1);

-- Upcoming confirmed (next few days)
INSERT INTO public.sessions (coach_id, client_id, tenant_id, availability_slot_id, scheduled_time, status, notes)
SELECT
  c.id,
  (SELECT id FROM public.clients WHERE client_id = 'demo' AND coach_id = c.id ORDER BY id LIMIT 1 OFFSET 0),
  'demo',
  (SELECT id FROM public.availability_slots WHERE coach_id = c.id AND start_time >= NOW() ORDER BY start_time ASC LIMIT 1 OFFSET 0),
  (date_trunc('day', NOW()) + '1 day'::interval + '09:00'::interval)::timestamptz,
  'confirmed',
  'Private lesson'
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS c(id)
WHERE EXISTS (SELECT 1 FROM public.availability_slots WHERE coach_id = c.id AND start_time >= NOW());

INSERT INTO public.sessions (coach_id, client_id, tenant_id, availability_slot_id, scheduled_time, status, notes)
SELECT
  c.id,
  (SELECT id FROM public.clients WHERE client_id = 'demo' AND coach_id = c.id ORDER BY id LIMIT 1 OFFSET 1),
  'demo',
  (SELECT id FROM public.availability_slots WHERE coach_id = c.id AND start_time >= NOW() ORDER BY start_time ASC LIMIT 1 OFFSET 1),
  (date_trunc('day', NOW()) + '2 days'::interval + '09:00'::interval)::timestamptz,
  'confirmed',
  NULL
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS c(id)
WHERE (SELECT COUNT(*) FROM public.clients WHERE client_id = 'demo' AND coach_id = c.id) >= 2
  AND EXISTS (SELECT 1 FROM public.availability_slots WHERE coach_id = c.id AND start_time >= NOW());

-- ========== SESSION_REQUESTS (mixed statuses) ==========
INSERT INTO public.session_requests (coach_id, client_id, session_product_id, tenant_id, status, amount_cents)
SELECT
  coach.id,
  (SELECT id FROM public.clients WHERE client_id = 'demo' AND coach_id = coach.id ORDER BY id LIMIT 1 OFFSET 0),
  (SELECT id FROM public.session_products WHERE coach_id = coach.id ORDER BY created_at LIMIT 1),
  'demo',
  'offered',
  7500
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

INSERT INTO public.session_requests (coach_id, client_id, session_product_id, tenant_id, status, amount_cents)
SELECT
  coach.id,
  (SELECT id FROM public.clients WHERE client_id = 'demo' AND coach_id = coach.id ORDER BY id LIMIT 1 OFFSET 1),
  (SELECT id FROM public.session_products WHERE coach_id = coach.id ORDER BY created_at LIMIT 1 OFFSET 1),
  'demo',
  'paid',
  35000
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id)
WHERE (SELECT COUNT(*) FROM public.clients WHERE client_id = 'demo' AND coach_id = coach.id) >= 2;

INSERT INTO public.session_requests (coach_id, client_id, session_product_id, tenant_id, status, amount_cents)
SELECT
  coach.id,
  (SELECT id FROM public.clients WHERE client_id = 'demo' AND coach_id = coach.id ORDER BY id LIMIT 1 OFFSET 2),
  (SELECT id FROM public.session_products WHERE coach_id = coach.id ORDER BY created_at LIMIT 1),
  'demo',
  'scheduled',
  7500
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id)
WHERE (SELECT COUNT(*) FROM public.clients WHERE client_id = 'demo' AND coach_id = coach.id) >= 3;

-- ========== PAYMENTS (past 8 weeks – revenue charts) ==========
INSERT INTO public.payments (coach_id, client_id, amount_cents, currency, status, provider, created_at)
SELECT
  c.id,
  'demo',
  7500 + (n * 500),
  'usd',
  'succeeded',
  'stripe',
  (date_trunc('week', NOW() - interval '8 weeks') + (n || ' weeks')::interval + (n % 7 || ' days')::interval + '12:00'::interval)::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS c(id),
     generate_series(0, 7) AS n;

INSERT INTO public.payments (coach_id, client_id, amount_cents, currency, status, provider, created_at)
SELECT id, 'demo', 35000, 'usd', 'succeeded', 'stripe', (NOW() - interval '2 weeks')::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

INSERT INTO public.payments (coach_id, client_id, amount_cents, currency, status, provider, created_at)
SELECT id, 'demo', 7500, 'usd', 'recorded_manual', 'other', (NOW() - interval '5 days')::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

-- ========== MESSAGES (coach <-> clients, last 2 months) ==========
-- Coach to client and client to coach; client_id = 'demo' for tenant
INSERT INTO public.messages (sender_id, recipient_id, client_id, content, read_at, created_at)
SELECT
  coach.id,
  prof.id,
  'demo',
  'Hey, great session today. See you next week!',
  NOW() - interval '1 day',
  (NOW() - interval '6 weeks')::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id),
     (SELECT p.id FROM public.profiles p INNER JOIN public.clients cl ON cl.email = p.email AND cl.client_id = 'demo' WHERE p.role = 'client' LIMIT 1) AS prof(id);

INSERT INTO public.messages (sender_id, recipient_id, client_id, content, read_at, created_at)
SELECT
  prof.id,
  coach.id,
  'demo',
  'Thanks! Can we do 3pm instead of 2pm next time?',
  NULL,
  (NOW() - interval '5 weeks')::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id),
     (SELECT p.id FROM public.profiles p INNER JOIN public.clients cl ON cl.email = p.email AND cl.client_id = 'demo' WHERE p.role = 'client' LIMIT 1) AS prof(id);

INSERT INTO public.messages (sender_id, recipient_id, client_id, content, read_at, created_at)
SELECT
  coach.id,
  prof.id,
  'demo',
  'Your new program is ready. Check the Programs tab.',
  NULL,
  (NOW() - interval '3 weeks')::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id),
     (SELECT p.id FROM public.profiles p INNER JOIN public.clients cl ON cl.email = p.email AND cl.client_id = 'demo' WHERE p.role = 'client' LIMIT 1 OFFSET 1) AS prof(id);

INSERT INTO public.messages (sender_id, recipient_id, client_id, content, read_at, created_at)
SELECT
  prof.id,
  coach.id,
  'demo',
  'Running 10 min late today, see you soon.',
  NOW(),
  (NOW() - interval '2 days')::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id),
     (SELECT p.id FROM public.profiles p INNER JOIN public.clients cl ON cl.email = p.email AND cl.client_id = 'demo' WHERE p.role = 'client' LIMIT 1) AS prof(id);

INSERT INTO public.messages (sender_id, recipient_id, client_id, content, read_at, created_at)
SELECT
  coach.id,
  coach.id,
  'demo',
  'Reminder: 3 sessions this week. Keep the momentum!',
  NULL,
  (NOW() - interval '4 days')::timestamptz
FROM (SELECT id FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1) AS coach(id);

-- More messages across different clients (2–3 per client profile)
DO $$
DECLARE
  coach_uuid uuid;
  client_rec record;
  i int;
  contents text[] := ARRAY[
    'Session confirmed for tomorrow at 9am.',
    'Here is the video I mentioned – check your Videos tab.',
    'When are you free next week?',
    'Payment received, thanks!',
    'Let me know if you have any questions about the program.'
  ];
BEGIN
  SELECT id INTO coach_uuid FROM public.profiles WHERE role = 'coach' AND tenant_id = 'demo' LIMIT 1;
  IF coach_uuid IS NULL THEN RETURN; END IF;
  i := 0;
  FOR client_rec IN
    SELECT p.id AS profile_id
    FROM public.profiles p
    INNER JOIN public.clients cl ON cl.email = p.email AND cl.client_id = 'demo' AND cl.coach_id = coach_uuid
    WHERE p.role = 'client'
    LIMIT 10
  LOOP
    INSERT INTO public.messages (sender_id, recipient_id, client_id, content, created_at)
    VALUES (coach_uuid, client_rec.profile_id, 'demo', contents[1 + (i % 5)], (NOW() - (i || ' days')::interval)::timestamptz);
    INSERT INTO public.messages (sender_id, recipient_id, client_id, content, created_at)
    VALUES (client_rec.profile_id, coach_uuid, 'demo', 'Sounds good, thanks!', (NOW() - (i || ' days')::interval + interval '2 hours')::timestamptz);
    i := i + 1;
  END LOOP;
END $$;
