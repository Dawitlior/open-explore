CREATE TABLE public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  route text,
  message text NOT NULL,
  stack_hash text NOT NULL,
  user_agent text,
  occurrences int NOT NULL DEFAULT 1,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_errors_user_hash ON public.client_errors(user_id, stack_hash);
CREATE INDEX idx_client_errors_created ON public.client_errors(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own errors"
  ON public.client_errors FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own errors"
  ON public.client_errors FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users view own errors"
  ON public.client_errors FOR SELECT TO authenticated
  USING (auth.uid() = user_id);