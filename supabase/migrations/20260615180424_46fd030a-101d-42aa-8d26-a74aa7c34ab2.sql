-- 1) Table
CREATE TABLE public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  starting_balance numeric NOT NULL DEFAULT 0,
  color text,
  icon text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Uniqueness
CREATE UNIQUE INDEX portfolios_user_name_uniq ON public.portfolios (user_id, lower(name));
CREATE UNIQUE INDEX portfolios_user_default_uniq ON public.portfolios (user_id) WHERE is_default = true;
CREATE INDEX portfolios_user_sort_idx ON public.portfolios (user_id, sort_order);

-- 3) GRANT (Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT ALL ON public.portfolios TO service_role;

-- 4) RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolios"
  ON public.portfolios FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolios"
  ON public.portfolios FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON public.portfolios FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
  ON public.portfolios FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5) updated_at trigger (reusing the existing touch_updated_at function)
CREATE TRIGGER portfolios_touch_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();