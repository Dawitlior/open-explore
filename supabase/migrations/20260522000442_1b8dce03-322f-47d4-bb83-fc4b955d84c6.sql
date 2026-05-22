
ALTER TABLE public.oracle_nodes
  ADD COLUMN IF NOT EXISTS stratum text NOT NULL DEFAULT 'S5',
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS counter_for text;

ALTER TABLE public.oracle_telemetry
  ADD COLUMN IF NOT EXISTS idle_pause_ms integer,
  ADD COLUMN IF NOT EXISTS re_read_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abandon_flag boolean NOT NULL DEFAULT false;

ALTER TABLE public.oracle_sessions
  ADD COLUMN IF NOT EXISTS claim_ledger jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS instability_index numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS oracle_nodes_stratum_idx ON public.oracle_nodes (stratum);
CREATE INDEX IF NOT EXISTS oracle_nodes_claim_token_idx ON public.oracle_nodes (claim_token) WHERE claim_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS oracle_nodes_counter_for_idx ON public.oracle_nodes (counter_for) WHERE counter_for IS NOT NULL;
