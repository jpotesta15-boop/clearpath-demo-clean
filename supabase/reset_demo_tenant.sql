-- Reset demo tenant data for ClearPath Coach OS
-- 
-- This script deletes tenant-scoped demo data (tenant_id/client_id = 'demo')
-- from key tables so you can re-run seeds like:
--   - supabase/seed_full_using_existing.sql
--   - supabase/seed_demo.sql
--
-- Default tenant is 'demo'. If you use a different tenant id for your demo,
-- replace 'demo' in the DECLARE block and in any WHERE clauses below.
--
-- Safe to run multiple times; it only deletes rows for the configured tenant.

DO $$
DECLARE
  demo_tenant TEXT := 'demo';
BEGIN
  -- Acquire a transactional advisory lock to avoid concurrent resets
  PERFORM pg_advisory_xact_lock(hashtext('reset_demo_tenant_' || demo_tenant));

  -- 1) Video completions for demo clients
  DELETE FROM public.video_completions
  WHERE client_id IN (
    SELECT id FROM public.clients WHERE client_id = demo_tenant
  );

  -- 2) Program and video assignments for demo clients
  DELETE FROM public.program_assignments
  WHERE client_id IN (
    SELECT id FROM public.clients WHERE client_id = demo_tenant
  );

  DELETE FROM public.video_assignments
  WHERE client_id IN (
    SELECT id FROM public.clients WHERE client_id = demo_tenant
  );

  -- 3) Session-related tables

  -- Client-initiated time requests
  DELETE FROM public.client_time_requests
  WHERE tenant_id = demo_tenant;

  -- Session requests (offers, paid, scheduled, etc.)
  DELETE FROM public.session_requests
  WHERE tenant_id = demo_tenant;

  -- Sessions (bookings)
  DELETE FROM public.sessions
  WHERE tenant_id = demo_tenant;

  -- Availability slots for the demo tenant
  DELETE FROM public.availability_slots
  WHERE client_id = demo_tenant
    OR coach_id IN (
      SELECT id FROM public.profiles WHERE tenant_id = demo_tenant
    );

  -- 4) Payments for demo tenant
  DELETE FROM public.payments
  WHERE client_id = demo_tenant
     OR coach_id IN (
       SELECT id FROM public.profiles WHERE tenant_id = demo_tenant
     );

  -- 5) Coach daily messages targeting the demo tenant
  DELETE FROM public.coach_daily_messages
  WHERE client_id = demo_tenant
     OR coach_id IN (
       SELECT id FROM public.profiles WHERE tenant_id = demo_tenant
     );

  -- 6) Messages scoped to the demo tenant
  DELETE FROM public.messages
  WHERE client_id = demo_tenant
     OR sender_id IN (
       SELECT id FROM public.profiles WHERE tenant_id = demo_tenant
     )
     OR recipient_id IN (
       SELECT id FROM public.profiles WHERE tenant_id = demo_tenant
     );

  -- 7) Programs and videos owned by the demo tenant
  DELETE FROM public.program_lessons
  WHERE program_id IN (
    SELECT id FROM public.programs WHERE client_id = demo_tenant
  );

  DELETE FROM public.programs
  WHERE client_id = demo_tenant;

  DELETE FROM public.videos
  WHERE client_id = demo_tenant;

  -- 8) Session products / packages for the demo tenant
  DELETE FROM public.session_products
  WHERE client_id = demo_tenant
     OR coach_id IN (
       SELECT id FROM public.profiles WHERE tenant_id = demo_tenant
     );

  -- 9) Clients in the demo tenant (domain-specific client records, NOT auth.users)
  DELETE FROM public.clients
  WHERE client_id = demo_tenant;

  -- Note: We intentionally do NOT delete from public.profiles or auth.users here.
  -- Keep your demo coach/client auth users and profile rows; they will be reused
  -- when re-seeding data for the same tenant.

END $$;

