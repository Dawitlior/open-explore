
CREATE TABLE IF NOT EXISTS public.economic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text NOT NULL,
  release_at timestamptz NOT NULL,
  currency text,
  country text,
  event_name text NOT NULL,
  category text,
  impact text NOT NULL DEFAULT 't3' CHECK (impact IN ('t1','t2','t3')),
  actual text,
  forecast text,
  previous text,
  unit text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS economic_events_release_at_idx ON public.economic_events (release_at);
CREATE INDEX IF NOT EXISTS economic_events_impact_release_idx ON public.economic_events (impact, release_at);

ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "economic_events_select_authenticated"
  ON public.economic_events FOR SELECT
  TO authenticated
  USING (true);

-- No insert/update/delete policies => only service_role (which bypasses RLS) can write.

CREATE TRIGGER economic_events_touch_updated_at
  BEFORE UPDATE ON public.economic_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.economic_events;
ALTER TABLE public.economic_events REPLICA IDENTITY FULL;
