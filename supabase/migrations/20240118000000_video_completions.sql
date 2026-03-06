-- Video completion tracking: clients mark videos as done; coaches see progress
CREATE TABLE public.video_completions (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(client_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_completions_client ON public.video_completions(client_id);
CREATE INDEX IF NOT EXISTS idx_video_completions_video ON public.video_completions(video_id);

ALTER TABLE public.video_completions ENABLE ROW LEVEL SECURITY;

-- Clients can insert/select their own completions (via client_id matching their email)
CREATE POLICY "Clients can manage own video completions" ON public.video_completions
  FOR ALL USING (
    client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Coaches can view completions for their clients
CREATE POLICY "Coaches can view video completions in tenant" ON public.video_completions
  FOR SELECT USING (
    client_id IN (
      SELECT c.id FROM public.clients c
      WHERE c.coach_id = auth.uid()
      AND (c.client_id = get_current_client_id() OR c.client_id IS NULL)
    )
  );
