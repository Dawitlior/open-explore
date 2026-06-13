
-- 1. Clean up duplicate avatar storage policies (keep authenticated-scoped set only).
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;

-- Tighten avatars_insert_own: it had no WITH CHECK clause, recreate properly.
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 2. billing_events: replace permissive-false IUD policies with explicit
--    restrictive deny policies so the intent is unambiguous, and ensure no
--    anon access path exists.
DROP POLICY IF EXISTS billing_events_no_insert ON public.billing_events;
DROP POLICY IF EXISTS billing_events_no_update ON public.billing_events;
DROP POLICY IF EXISTS billing_events_no_delete ON public.billing_events;

CREATE POLICY billing_events_block_writes ON public.billing_events
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

REVOKE ALL ON public.billing_events FROM anon;

-- 3. Realtime channel authorization — without any policy on realtime.messages,
--    any authenticated client can subscribe to any topic. Add an explicit
--    deny-all policy; this app does not use Realtime broadcasts.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS deny_all_realtime_messages ON realtime.messages';
    EXECUTE $p$CREATE POLICY deny_all_realtime_messages ON realtime.messages
      AS RESTRICTIVE FOR ALL TO authenticated, anon
      USING (false) WITH CHECK (false)$p$;
  END IF;
END $$;
