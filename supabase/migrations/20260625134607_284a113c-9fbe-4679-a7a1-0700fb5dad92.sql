
-- Helpers — SECURITY DEFINER so they bypass RLS and break recursion.

CREATE OR REPLACE FUNCTION public.is_bug_reporter(_bug_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bug_reporters
    WHERE bug_id = _bug_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_bug_creator(_bug_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bug_reports
    WHERE id = _bug_id AND created_by = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_bug_reporter(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_bug_creator(uuid, uuid)  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_bug_reporter(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_bug_creator(uuid, uuid)  TO authenticated, service_role;

-- ── bug_reports: SELECT — use helper instead of inline bug_reporters subquery
DROP POLICY IF EXISTS bugs_read_owner_admin_reporter ON public.bug_reports;
CREATE POLICY bugs_read_owner_admin_reporter
ON public.bug_reports
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
  OR public.is_bug_reporter(id, auth.uid())
);

-- ── bug_reporters: SELECT — was self-referential (r2). Use helpers.
DROP POLICY IF EXISTS reporters_read_scoped ON public.bug_reporters;
CREATE POLICY reporters_read_scoped
ON public.bug_reporters
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.is_bug_reporter(bug_id, auth.uid())
  OR public.is_bug_creator(bug_id, auth.uid())
);

-- ── bug_reporters: DELETE — uses bug_reporters count inline; use helper
DROP POLICY IF EXISTS reporters_leave_self ON public.bug_reporters;
CREATE POLICY reporters_leave_self
ON public.bug_reporters
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND public.reporter_count(bug_id) > 1
);

-- ── bug_comments: SELECT — use helpers
DROP POLICY IF EXISTS cmt_read_scoped ON public.bug_comments;
CREATE POLICY cmt_read_scoped
ON public.bug_comments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.is_bug_reporter(bug_id, auth.uid())
  OR public.is_bug_creator(bug_id, auth.uid())
);

-- ── bug_attachments: SELECT — use helpers
DROP POLICY IF EXISTS att_read_scoped ON public.bug_attachments;
CREATE POLICY att_read_scoped
ON public.bug_attachments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.is_bug_reporter(bug_id, auth.uid())
  OR public.is_bug_creator(bug_id, auth.uid())
);

-- ── bug_attachments: INSERT — used bug_reporters inline; use helper
DROP POLICY IF EXISTS att_insert_if_reporter ON public.bug_attachments;
CREATE POLICY att_insert_if_reporter
ON public.bug_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_bug_reporter(bug_id, auth.uid())
);

-- ── bug_resolution_feedback: INSERT — used bug_reporters inline; use helper
DROP POLICY IF EXISTS brf_insert ON public.bug_resolution_feedback;
CREATE POLICY brf_insert
ON public.bug_resolution_feedback
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_bug_reporter(bug_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.bug_reports b
    WHERE b.id = bug_resolution_feedback.bug_id AND b.status = 'resolved'
  )
);
