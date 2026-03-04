-- Set profile tenant_id from user metadata when present (e.g. invite or create-client-account).
-- Ensures invited clients get the correct tenant so RLS allows messages and session requests.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_role text := 'client';
  meta_tenant_id text;
BEGIN
  IF (SELECT COUNT(*) FROM public.profiles) = 0 THEN
    default_role := 'coach';
  END IF;
  meta_tenant_id := NEW.raw_user_meta_data->>'tenant_id';
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    default_role,
    meta_tenant_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
