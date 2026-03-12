-- White-label: extend coach branding, email settings, portal nav, terminology, and domain verification status

-- 1) Extend coach_brand_settings for full white-label
ALTER TABLE public.coach_brand_settings
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS background_color TEXT,
  ADD COLUMN IF NOT EXISTS white_label BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.coach_brand_settings.brand_name IS 'Organization/coach display name for white-label';
COMMENT ON COLUMN public.coach_brand_settings.favicon_url IS 'Favicon URL for client portal and login';
COMMENT ON COLUMN public.coach_brand_settings.background_color IS 'Optional background color override';
COMMENT ON COLUMN public.coach_brand_settings.white_label IS 'When true, hide platform branding (Powered by, platform logos)';

-- 2) Email branding per coach
CREATE TABLE IF NOT EXISTS public.coach_email_settings (
  coach_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  email_logo_url TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_email_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_email_settings_tenant ON public.coach_email_settings(tenant_id);

CREATE POLICY "Coaches can manage coach_email_settings in their tenant"
  ON public.coach_email_settings
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid() AND role = 'coach' AND tenant_id = get_current_client_id()
    )
  );

-- 3) Portal customization: which nav items to show and optional terminology
ALTER TABLE public.coach_client_experience
  ADD COLUMN IF NOT EXISTS portal_nav_enabled JSONB DEFAULT '["schedule", "messages", "programs", "videos", "payments"]'::jsonb,
  ADD COLUMN IF NOT EXISTS portal_booking_instructions TEXT,
  ADD COLUMN IF NOT EXISTS terminology JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.coach_client_experience.portal_nav_enabled IS 'Array of enabled client portal sections: schedule, messages, programs, videos, payments';
COMMENT ON COLUMN public.coach_client_experience.portal_booking_instructions IS 'Custom instructions for booking shown to clients';
COMMENT ON COLUMN public.coach_client_experience.terminology IS 'Optional label overrides e.g. {"client":"Student","session":"Lesson","coach":"Instructor"}';

-- 4) coach_domains: add domain_verified for clarity (status already has active/pending_verification)
ALTER TABLE public.coach_domains
  ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.coach_domains.domain_verified IS 'True when DNS/HTTP verification succeeded and status is active';

-- 5) Clients may read their coach's brand for portal white-labeling
DROP POLICY IF EXISTS "Clients can read coach_brand_settings for their coach" ON public.coach_brand_settings;
CREATE POLICY "Clients can read coach_brand_settings for their coach"
  ON public.coach_brand_settings
  FOR SELECT USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT coach_id FROM public.clients
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        AND client_id = get_current_client_id()
    )
  );
