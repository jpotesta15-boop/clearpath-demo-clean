-- Coach OS personalization & ownership
-- Branding, custom domains, dashboard layouts, client experience, messaging, and coach profile/social

-- 1) Branding & identity
CREATE TABLE IF NOT EXISTS public.coach_brand_settings (
  coach_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  logo_url TEXT,
  app_icon_url TEXT,
  brand_image_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  theme_mode TEXT CHECK (theme_mode IN ('light', 'dark', 'system')) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_brand_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_brand_settings_tenant
  ON public.coach_brand_settings(tenant_id);

CREATE POLICY "Coaches can manage coach_brand_settings in their tenant"
  ON public.coach_brand_settings
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

-- 2) Custom domains (full custom domains first)
CREATE TABLE IF NOT EXISTS public.coach_domains (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (
    status IN ('pending_verification', 'verifying', 'active', 'error', 'disabled')
  ),
  verification_token TEXT NOT NULL,
  verification_method TEXT NOT NULL DEFAULT 'dns_txt' CHECK (
    verification_method IN ('dns_txt', 'http_file')
  ),
  last_checked_at TIMESTAMPTZ,
  error_message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  ssl_status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    ssl_status IN ('not_started', 'provisioning', 'issued', 'failed')
  )
);

ALTER TABLE public.coach_domains ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_domains_coach
  ON public.coach_domains(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_domains_tenant
  ON public.coach_domains(tenant_id);

CREATE POLICY "Coaches can manage coach_domains in their tenant"
  ON public.coach_domains
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

-- 3) Dashboard personalization
CREATE TABLE IF NOT EXISTS public.coach_dashboard_layouts (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'default',
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  layout_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_dashboard_layouts_coach
  ON public.coach_dashboard_layouts(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_dashboard_layouts_tenant
  ON public.coach_dashboard_layouts(tenant_id);

CREATE POLICY "Coaches can manage coach_dashboard_layouts in their tenant"
  ON public.coach_dashboard_layouts
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

-- 4) Client experience customization
CREATE TABLE IF NOT EXISTS public.coach_client_experience (
  coach_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  welcome_title TEXT,
  welcome_body TEXT,
  hero_image_url TEXT,
  intro_video_source TEXT CHECK (intro_video_source IN ('google_drive', 'youtube', 'upload')) ,
  intro_video_url TEXT,
  intro_video_metadata JSONB,
  show_welcome_block BOOLEAN NOT NULL DEFAULT TRUE,
  portal_theme_overrides JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_client_experience ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_client_experience_tenant
  ON public.coach_client_experience(tenant_id);

CREATE POLICY "Coaches can manage coach_client_experience in their tenant"
  ON public.coach_client_experience
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

-- 5) Messaging & broadcast tools
CREATE TABLE IF NOT EXISTS public.coach_message_templates (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body_markdown TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'in_app')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_message_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_message_templates_coach
  ON public.coach_message_templates(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_message_templates_tenant
  ON public.coach_message_templates(tenant_id);

CREATE POLICY "Coaches can manage coach_message_templates in their tenant"
  ON public.coach_message_templates
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

CREATE TABLE IF NOT EXISTS public.coach_broadcasts (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  template_id UUID REFERENCES public.coach_message_templates(id) ON DELETE SET NULL,
  subject TEXT,
  body_rendered TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'in_app')),
  segment_filter JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'canceled')
  ),
  send_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_broadcasts_coach
  ON public.coach_broadcasts(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_broadcasts_tenant
  ON public.coach_broadcasts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_coach_broadcasts_send_at
  ON public.coach_broadcasts(send_at);

CREATE POLICY "Coaches can manage coach_broadcasts in their tenant"
  ON public.coach_broadcasts
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

CREATE TABLE IF NOT EXISTS public.coach_broadcast_recipients (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  broadcast_id UUID REFERENCES public.coach_broadcasts(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'queued', 'sent', 'bounced', 'failed', 'unsubscribed')
  ),
  delivery_metadata JSONB,
  delivered_at TIMESTAMPTZ
);

ALTER TABLE public.coach_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_broadcast_recipients_broadcast
  ON public.coach_broadcast_recipients(broadcast_id);

CREATE INDEX IF NOT EXISTS idx_coach_broadcast_recipients_tenant
  ON public.coach_broadcast_recipients(tenant_id);

CREATE POLICY "Coaches can view coach_broadcast_recipients in their tenant"
  ON public.coach_broadcast_recipients
  FOR SELECT USING (
    tenant_id = get_current_client_id()
    AND broadcast_id IN (
      SELECT id FROM public.coach_broadcasts
      WHERE tenant_id = get_current_client_id()
        AND coach_id IN (
          SELECT id FROM public.profiles
          WHERE id = auth.uid()
            AND role = 'coach'
            AND tenant_id = get_current_client_id()
        )
    )
  );

-- 6) Social + profile integrations
CREATE TABLE IF NOT EXISTS public.coach_profiles (
  coach_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  specialties TEXT[],
  profile_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  show_social_links BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_profiles_tenant
  ON public.coach_profiles(tenant_id);

CREATE POLICY "Coaches can manage coach_profiles in their tenant"
  ON public.coach_profiles
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

CREATE TABLE IF NOT EXISTS public.coach_social_links (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (
    platform IN ('website', 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x', 'other')
  ),
  label TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.coach_social_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coach_social_links_coach
  ON public.coach_social_links(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_social_links_tenant
  ON public.coach_social_links(tenant_id);

CREATE POLICY "Coaches can manage coach_social_links in their tenant"
  ON public.coach_social_links
  FOR ALL USING (
    tenant_id = get_current_client_id()
    AND coach_id IN (
      SELECT id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'coach'
        AND tenant_id = get_current_client_id()
    )
  );

