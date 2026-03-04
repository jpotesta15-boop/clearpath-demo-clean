-- Program lessons: programs as ordered lists of videos
CREATE TABLE public.program_lessons (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_program_lessons_program ON public.program_lessons(program_id);

-- RLS: same as programs (coach can manage their program's lessons)
ALTER TABLE public.program_lessons ENABLE ROW LEVEL SECURITY;

-- For tenant isolation migration: if client_id exists on programs, program_lessons access follows program
CREATE POLICY "Coach can manage program lessons"
  ON public.program_lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE programs.id = program_lessons.program_id
      AND programs.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.programs
      WHERE programs.id = program_lessons.program_id
      AND programs.coach_id = auth.uid()
    )
  );

-- Clients can view lessons for programs they are assigned to
CREATE POLICY "Clients can view assigned program lessons"
  ON public.program_lessons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_assignments pa
      JOIN public.clients c ON c.id = pa.client_id
      JOIN public.profiles p ON p.email = c.email AND p.id = auth.uid()
      WHERE pa.program_id = program_lessons.program_id
    )
  );
