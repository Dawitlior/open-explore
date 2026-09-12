CREATE TABLE public.news_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  headline text NOT NULL,
  summary text,
  source text,
  url text,
  category text NOT NULL DEFAULT 'general',
  impact text NOT NULL DEFAULT 'medium',
  symbols text[] NOT NULL DEFAULT '{}',
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX news_feed_published_at_idx ON public.news_feed (published_at DESC);

GRANT SELECT ON public.news_feed TO authenticated;
GRANT ALL ON public.news_feed TO service_role;

ALTER TABLE public.news_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read news"
  ON public.news_feed FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.news_feed_prune()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.news_feed
   WHERE published_at < now() - interval '3 days';

  DELETE FROM public.news_feed
   WHERE id IN (
     SELECT id FROM public.news_feed
      ORDER BY published_at DESC, created_at DESC
      OFFSET 30
   );
  RETURN NULL;
END;
$$;

CREATE TRIGGER news_feed_prune_trg
AFTER INSERT ON public.news_feed
FOR EACH STATEMENT EXECUTE FUNCTION public.news_feed_prune();