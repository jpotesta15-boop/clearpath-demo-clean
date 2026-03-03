-- Coach customization: display name (sidebar), time zone, and preferences (e.g. default session duration)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

COMMENT ON COLUMN public.profiles.display_name IS 'Optional name shown in sidebar for coaches; overrides tenant brand when set';
COMMENT ON COLUMN public.profiles.timezone IS 'IANA time zone for schedule display (e.g. America/New_York)';
COMMENT ON COLUMN public.profiles.preferences IS 'Coach preferences e.g. default_session_duration_minutes';
