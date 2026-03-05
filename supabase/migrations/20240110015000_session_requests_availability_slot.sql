-- Link session_requests to availability_slots for open paid slots
ALTER TABLE public.session_requests
  ADD COLUMN IF NOT EXISTS availability_slot_id UUID REFERENCES public.availability_slots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_session_requests_availability_slot
  ON public.session_requests(availability_slot_id);

