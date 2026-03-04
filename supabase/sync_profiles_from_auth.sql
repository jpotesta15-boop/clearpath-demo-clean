-- Run this in Supabase Dashboard → SQL Editor
-- 1) Syncs profiles from your existing Auth users and sets tenant_id = 'demo'
-- 2) Creates a client record for each client profile under the coach so they can use the client dashboard

-- Step 1: Profiles from Auth (first user = coach, rest = client, tenant_id = 'demo')
INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
  CASE
    WHEN u.id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) THEN 'coach'
    ELSE 'client'
  END,
  'demo'
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  tenant_id = 'demo',
  updated_at = NOW();

-- Step 2: Client records for each client profile (so they can log in and see client dashboard)
INSERT INTO public.clients (coach_id, client_id, full_name, email)
SELECT
  (SELECT id FROM public.profiles WHERE role = 'coach' LIMIT 1),
  'demo',
  p.full_name,
  p.email
FROM public.profiles p
WHERE p.role = 'client'
  AND p.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.email = p.email AND c.client_id = 'demo'
  );
