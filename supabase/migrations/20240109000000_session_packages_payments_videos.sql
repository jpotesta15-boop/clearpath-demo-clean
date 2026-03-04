-- Phase 1: Video thumbnails, session products, session requests, payments, sessions link
-- 1) videos.thumbnail_url
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 2) session_products (sellable packages)
CREATE TABLE public.session_products (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  goal TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  price_cents INTEGER NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_products_coach ON public.session_products(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_products_client_id ON public.session_products(client_id);
ALTER TABLE public.session_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage session_products in their tenant" ON public.session_products
  FOR ALL USING (
    client_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach' AND tenant_id = get_current_client_id()
    )
  );

-- 3) session_requests (offer -> accept -> pay -> availability -> scheduled)
CREATE TABLE public.session_requests (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  session_product_id UUID REFERENCES public.session_products(id) ON DELETE SET NULL,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN (
    'offered', 'accepted', 'payment_pending', 'paid',
    'availability_submitted', 'scheduled', 'cancelled'
  )),
  amount_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  availability_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_requests_coach ON public.session_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_client ON public.session_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_status ON public.session_requests(status);
CREATE INDEX IF NOT EXISTS idx_session_requests_tenant ON public.session_requests(tenant_id);
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage session_requests in their tenant" ON public.session_requests
  FOR ALL USING (
    tenant_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach' AND tenant_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can view own session_requests" ON public.session_requests
  FOR SELECT USING (
    tenant_id = get_current_client_id() AND
    client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );

CREATE POLICY "Clients can update own session_requests" ON public.session_requests
  FOR UPDATE USING (
    tenant_id = get_current_client_id() AND
    client_id IN (
      SELECT id FROM public.clients
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      AND client_id = get_current_client_id()
    )
  );

-- 4) payments
CREATE TABLE public.payments (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id TEXT NOT NULL,
  session_request_id UUID REFERENCES public.session_requests(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'refunded', 'cancelled', 'recorded_manual')),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'zelle', 'paypal', 'cashapp', 'other')),
  stripe_payment_intent_id TEXT,
  payer_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_coach ON public.payments(coach_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage payments in their tenant" ON public.payments
  FOR ALL USING (
    client_id = get_current_client_id() AND
    coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach' AND tenant_id = get_current_client_id()
    )
  );

-- 5) sessions: link to session_request and product, amount
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_request_id UUID REFERENCES public.session_requests(id) ON DELETE SET NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_product_id UUID REFERENCES public.session_products(id) ON DELETE SET NULL;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
CREATE INDEX IF NOT EXISTS idx_sessions_session_request ON public.sessions(session_request_id);
