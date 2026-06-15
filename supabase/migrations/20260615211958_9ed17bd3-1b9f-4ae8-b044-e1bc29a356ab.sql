
CREATE TABLE public.day_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, portfolio_id, date)
);

CREATE INDEX day_notes_user_date_idx ON public.day_notes(user_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_notes TO authenticated;
GRANT ALL ON public.day_notes TO service_role;

ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_notes_select_own" ON public.day_notes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "day_notes_insert_own" ON public.day_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_notes_update_own" ON public.day_notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "day_notes_delete_own" ON public.day_notes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER day_notes_touch_updated_at
  BEFORE UPDATE ON public.day_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
