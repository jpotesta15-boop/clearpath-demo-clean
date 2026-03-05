-- Link availability slots to session products for paid open slots
ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS session_product_id UUID REFERENCES public.session_products(id) ON DELETE SET NULL;

ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS label TEXT;

CREATE INDEX IF NOT EXISTS idx_availability_slots_session_product
  ON public.availability_slots(session_product_id);

