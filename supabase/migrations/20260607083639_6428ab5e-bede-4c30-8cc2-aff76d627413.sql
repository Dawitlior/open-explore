
-- Wave 1: P0 Security hardening

-- 1) Avatars bucket: drop the legacy public-read policy. Own-folder policies remain.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

-- 2) oracle_nodes: prevent claim_token leakage to clients.
--    Catalog data (prompts, options, etc.) stays readable; claim_token is now server-only.
REVOKE SELECT ON public.oracle_nodes FROM authenticated, anon;
GRANT SELECT (id, code, category, tier, prompt_he, prompt_en, options, branches, trap, trap_pair, created_at, updated_at, stratum, counter_for)
  ON public.oracle_nodes TO authenticated;
-- service_role retains full access for edge functions that need claim_token.

-- 3) billing_events: enforce ownership at the schema level.
ALTER TABLE public.billing_events ALTER COLUMN user_id SET NOT NULL;
