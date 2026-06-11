
-- 1) Revoke EXECUTE on trigger-only / internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_subscription()       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_preferences()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at()              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exchange_credentials_vault_store()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exchange_credentials_vault_purge()  FROM PUBLIC, anon, authenticated;

-- 2) Explicit deny on billing_events writes for authenticated users (defence in depth).
DROP POLICY IF EXISTS "billing_events_no_insert" ON public.billing_events;
DROP POLICY IF EXISTS "billing_events_no_update" ON public.billing_events;
DROP POLICY IF EXISTS "billing_events_no_delete" ON public.billing_events;

CREATE POLICY "billing_events_no_insert" ON public.billing_events
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "billing_events_no_update" ON public.billing_events
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "billing_events_no_delete" ON public.billing_events
  FOR DELETE TO authenticated USING (false);
