-- Coach customization: logo URL and tagline for sidebar/dashboard
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT;

COMMENT ON COLUMN public.profiles.logo_url IS 'Optional logo URL for coach branding in sidebar/header';
COMMENT ON COLUMN public.profiles.tagline IS 'Optional short tagline or welcome line for coach dashboard';
