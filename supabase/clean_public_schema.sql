-- Run this in Supabase Dashboard → SQL Editor to clear the public schema
-- so you can then run: supabase db push
--
-- WARNING: This deletes ALL tables and data in the public schema.

-- Drop all tables in public schema (handles FKs with CASCADE)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;
