-- Allow clients to update their own phone number (matched by email and tenant)
CREATE POLICY "Clients can update own phone" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    client_id = get_current_client_id()
    AND email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    client_id = get_current_client_id()
    AND email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
