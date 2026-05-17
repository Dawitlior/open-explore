CREATE TABLE IF NOT EXISTS public.live_risk_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL,
  entry_price numeric NOT NULL DEFAULT 0,
  stop_loss numeric NOT NULL DEFAULT 0,
  size numeric NOT NULL DEFAULT 0,
  exchange_order_id text,
  trade_id integer,
  captured_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS live_risk_locks_user_symbol_order_uq
  ON public.live_risk_locks (user_id, symbol, COALESCE(exchange_order_id, ''));

CREATE INDEX IF NOT EXISTS live_risk_locks_user_open_idx
  ON public.live_risk_locks (user_id, closed_at);

ALTER TABLE public.live_risk_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_risk_locks_select_own" ON public.live_risk_locks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "live_risk_locks_insert_own" ON public.live_risk_locks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_risk_locks_update_own" ON public.live_risk_locks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "live_risk_locks_delete_own" ON public.live_risk_locks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER live_risk_locks_touch
  BEFORE UPDATE ON public.live_risk_locks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();