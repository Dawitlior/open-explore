-- Wave 2: Cookie Consent + Privacy Layer
-- Add consent field to user_preferences + audit log table

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS consent jsonb;

CREATE TABLE IF NOT EXISTS public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  version text NOT NULL,
  choices jsonb NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.consent_log TO authenticated;
GRANT ALL ON public.consent_log TO service_role;

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consent log"
  ON public.consent_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent log"
  ON public.consent_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS consent_log_user_idx
  ON public.consent_log(user_id, created_at DESC);
