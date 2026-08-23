CREATE POLICY "deny all client access" ON public.rate_limit_events
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);