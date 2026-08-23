CREATE TABLE public.rate_limit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket text NOT NULL,
  subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limit_events_id_seq TO service_role;

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No policies: end users (anon/authenticated) have zero access.
-- Only service_role (edge functions) can insert/count, and it bypasses RLS.

CREATE INDEX rate_limit_events_lookup_idx
  ON public.rate_limit_events (bucket, subject, created_at DESC);