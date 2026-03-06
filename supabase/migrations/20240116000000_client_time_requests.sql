-- Client-initiated time requests: client says "I'm free Tue 5-7pm", coach sees and confirms
CREATE TABLE public.client_time_requests (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  preferred_times TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'offered', 'confirmed', 'declined')),
  session_request_id UUID REFERENCES public.session_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_time_requests_coach ON public.client_time_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_client_time_requests_client ON public.client_time_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_time_requests_tenant ON public.client_time_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_time_requests_status ON public.client_time_requests(status);

ALTER TABLE public.client_time_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage client_time_requests in their tenant" ON public.client_time_requests
  FOR ALL USING (
    tenant_id = get_current_client_id() AND
    coach_id = auth.uid()
  );

CREATE POLICY "Clients can insert own client_time_requests" ON public.client_time_requests
  FOR INSERT WITH CHECK (
    tenant_id = get_current_client_id() AND
    client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view own client_time_requests" ON public.client_time_requests
  FOR SELECT USING (
    tenant_id = get_current_client_id() AND
    client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );
