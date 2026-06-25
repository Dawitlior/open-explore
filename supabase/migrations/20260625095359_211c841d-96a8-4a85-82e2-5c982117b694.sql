
-- 1) Fix mutable search_path on brf_touch_updated_at
CREATE OR REPLACE FUNCTION public.brf_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
begin new.updated_at = now(); return new; end;
$$;

-- 2) Revoke EXECUTE from anon / PUBLIC on all SECURITY DEFINER functions in public,
--    grant only to authenticated and service_role.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon;', r.proname, r.args);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;', r.proname, r.args);
  END LOOP;
END $$;

-- 3) Tighten Bug Arena SELECT policies: admin, creator, or reporter only.

-- bug_reports
DROP POLICY IF EXISTS bugs_read_all ON public.bug_reports;
CREATE POLICY bugs_read_owner_admin_reporter ON public.bug_reports
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.bug_reporters r WHERE r.bug_id = bug_reports.id AND r.user_id = auth.uid())
);

-- bug_reporters
DROP POLICY IF EXISTS reporters_read_all ON public.bug_reporters;
CREATE POLICY reporters_read_scoped ON public.bug_reporters
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.bug_reporters r2 WHERE r2.bug_id = bug_reporters.bug_id AND r2.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.bug_reports b WHERE b.id = bug_reporters.bug_id AND b.created_by = auth.uid())
);

-- bug_attachments
DROP POLICY IF EXISTS att_read_all ON public.bug_attachments;
CREATE POLICY att_read_scoped ON public.bug_attachments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.bug_reporters r WHERE r.bug_id = bug_attachments.bug_id AND r.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.bug_reports b WHERE b.id = bug_attachments.bug_id AND b.created_by = auth.uid())
);

-- bug_comments
DROP POLICY IF EXISTS cmt_read_all ON public.bug_comments;
CREATE POLICY cmt_read_scoped ON public.bug_comments
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.bug_reporters r WHERE r.bug_id = bug_comments.bug_id AND r.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.bug_reports b WHERE b.id = bug_comments.bug_id AND b.created_by = auth.uid())
);

-- 4) Tighten storage bug-attachments read policy: admin, file owner, bug creator, or reporter.
DROP POLICY IF EXISTS bug_att_read ON storage.objects;
CREATE POLICY bug_att_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'bug-attachments'
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.bug_attachments a
      WHERE a.storage_path = storage.objects.name
        AND (
          a.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.bug_reporters r WHERE r.bug_id = a.bug_id AND r.user_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.bug_reports b WHERE b.id = a.bug_id AND b.created_by = auth.uid())
        )
    )
  )
);
