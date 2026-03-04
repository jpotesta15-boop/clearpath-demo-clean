-- Add tenant isolation (client_id) to all tables
-- This migration adds client_id column and updates RLS policies for multi-tenant support

-- Add client_id to profiles table (using email as identifier for now)
-- Note: We'll use a tenant_id field in profiles to identify which client/tenant a user belongs to
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Add client_id to all tenant tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.availability_slots ADD COLUMN IF NOT EXISTS client_id TEXT;
-- sessions.client_id is already UUID (FK to clients); add tenant_id for tenant RLS
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Note: program_assignments and video_assignments inherit client_id from their parent records
-- via the foreign key relationships, so we don't need to add it directly

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_client_id ON public.clients(client_id);
CREATE INDEX IF NOT EXISTS idx_programs_client_id ON public.programs(client_id);
CREATE INDEX IF NOT EXISTS idx_videos_client_id ON public.videos(client_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_client_id ON public.availability_slots(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_client_id ON public.messages(client_id);

-- Drop existing policies that don't account for tenant isolation
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Coaches can manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can view themselves" ON public.clients;
DROP POLICY IF EXISTS "Coaches can manage their programs" ON public.programs;
DROP POLICY IF EXISTS "Clients can view assigned programs" ON public.program_assignments;
DROP POLICY IF EXISTS "Coaches can manage their videos" ON public.videos;
DROP POLICY IF EXISTS "Clients can view assigned videos" ON public.video_assignments;
DROP POLICY IF EXISTS "Coaches can manage their availability" ON public.availability_slots;
DROP POLICY IF EXISTS "Coaches can manage their sessions" ON public.sessions;
DROP POLICY IF EXISTS "Clients can view and request sessions" ON public.sessions;
DROP POLICY IF EXISTS "Clients can create session requests" ON public.sessions;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their activity" ON public.activity_log;

-- Helper function to get current client_id from session
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get from session variable first (set by application)
  RETURN COALESCE(
    current_setting('app.client_id', true),
    -- Fallback: get from user's profile tenant_id
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated RLS Policies with tenant isolation

-- Profiles: Users can only see profiles in their tenant
CREATE POLICY "Users can view profiles in their tenant" ON public.profiles
  FOR SELECT USING (
    tenant_id = get_current_client_id() OR
    id = auth.uid()
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Clients: Coaches can manage clients in their tenant
CREATE POLICY "Coaches can manage clients in their tenant" ON public.clients
  FOR ALL USING (
    client_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'coach'
      AND tenant_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view themselves in their tenant" ON public.clients
  FOR SELECT USING (
    client_id = get_current_client_id() AND
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Programs: Coaches can manage programs in their tenant
CREATE POLICY "Coaches can manage programs in their tenant" ON public.programs
  FOR ALL USING (
    client_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'coach'
      AND tenant_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view assigned programs in their tenant" ON public.program_assignments
  FOR SELECT USING (
    program_id IN (
      SELECT id FROM public.programs 
      WHERE client_id = get_current_client_id()
    ) AND
    client_id IN (
      SELECT id FROM public.clients 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );

-- Videos: Coaches can manage videos in their tenant
CREATE POLICY "Coaches can manage videos in their tenant" ON public.videos
  FOR ALL USING (
    client_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'coach'
      AND tenant_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view assigned videos in their tenant" ON public.video_assignments
  FOR SELECT USING (
    video_id IN (
      SELECT id FROM public.videos 
      WHERE client_id = get_current_client_id()
    ) AND
    client_id IN (
      SELECT id FROM public.clients 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );

-- Availability slots: Coaches can manage in their tenant
CREATE POLICY "Coaches can manage availability in their tenant" ON public.availability_slots
  FOR ALL USING (
    client_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'coach'
      AND tenant_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view coach availability in their tenant" ON public.availability_slots
  FOR SELECT USING (client_id = get_current_client_id());

-- Sessions: Coaches can manage sessions in their tenant
CREATE POLICY "Coaches can manage sessions in their tenant" ON public.sessions
  FOR ALL USING (
    tenant_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'coach'
      AND tenant_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view sessions in their tenant" ON public.sessions
  FOR SELECT USING (
    tenant_id = get_current_client_id() AND
    client_id IN (
      SELECT id FROM public.clients 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can create session requests in their tenant" ON public.sessions
  FOR INSERT WITH CHECK (
    tenant_id = get_current_client_id() AND
    client_id IN (
      SELECT id FROM public.clients 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );

-- Messages: Users can view messages in their tenant
CREATE POLICY "Users can view messages in their tenant" ON public.messages
  FOR SELECT USING (
    client_id = get_current_client_id() AND
    (auth.uid() = sender_id OR auth.uid() = recipient_id)
  );

CREATE POLICY "Users can send messages in their tenant" ON public.messages
  FOR INSERT WITH CHECK (
    client_id = get_current_client_id() AND
    auth.uid() = sender_id
  );

-- Activity log: Users can view their activity in their tenant
CREATE POLICY "Users can view activity in their tenant" ON public.activity_log
  FOR SELECT USING (
    client_id = get_current_client_id() AND
    auth.uid() = user_id
  );

