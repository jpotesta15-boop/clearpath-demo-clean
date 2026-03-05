-- Coach daily / dashboard messages visible to clients
CREATE TABLE IF NOT EXISTS public.coach_daily_messages (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  client_id TEXT NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  effective_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_daily_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_daily_messages_coach_client
  ON public.coach_daily_messages(coach_id, client_id, effective_at);

CREATE POLICY "Coaches can manage daily messages in their tenant" ON public.coach_daily_messages
  FOR ALL USING (
    client_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach' AND tenant_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view coach daily messages in their tenant" ON public.coach_daily_messages
  FOR SELECT USING (
    client_id = get_current_client_id()
  );

