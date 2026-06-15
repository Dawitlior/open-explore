-- ============================================================
-- STAGE 2 — Multi-Portfolio: attach trades to portfolios
-- Append-only. No trade row is deleted or its data altered.
-- ============================================================

-- 1) Create a default portfolio for every existing user that doesn't have one.
INSERT INTO public.portfolios (user_id, name, currency, starting_balance, is_default, sort_order)
SELECT u.id, 'My Portfolio', 'USD', 0, true, 0
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.portfolios p WHERE p.user_id = u.id
);

-- 2) Add portfolio_id to trades (nullable for now so backfill can run).
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS portfolio_id uuid;

-- 3) Backfill: every existing trade → that user's default portfolio.
UPDATE public.trades t
SET portfolio_id = p.id
FROM public.portfolios p
WHERE p.user_id = t.user_id
  AND p.is_default = true
  AND t.portfolio_id IS NULL;

-- 4) Safety: if any user has trades but no portfolio (shouldn't happen after step 1),
--    create one and retry the backfill. This is a paranoid second pass.
INSERT INTO public.portfolios (user_id, name, currency, starting_balance, is_default, sort_order)
SELECT DISTINCT t.user_id, 'My Portfolio', 'USD', 0, true, 0
FROM public.trades t
WHERE t.portfolio_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.portfolios p WHERE p.user_id = t.user_id);

UPDATE public.trades t
SET portfolio_id = p.id
FROM public.portfolios p
WHERE p.user_id = t.user_id
  AND p.is_default = true
  AND t.portfolio_id IS NULL;

-- 5) Now lock it down: NOT NULL + FK with cascade delete.
ALTER TABLE public.trades
  ALTER COLUMN portfolio_id SET NOT NULL;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_portfolio_id_fkey
  FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS trades_user_portfolio_idx
  ON public.trades (user_id, portfolio_id);

-- 6) Idempotency: external_id uniqueness must include portfolio_id so the
--    same broker fill can live in two different portfolios without colliding.
DROP INDEX IF EXISTS public.trades_user_external_uidx;
CREATE UNIQUE INDEX trades_user_external_uidx
  ON public.trades (user_id, portfolio_id, broker_id, account_label, external_id)
  WHERE external_id IS NOT NULL;

-- Same for the older exchange_exec_id uniqueness (kept for back-compat).
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_user_exchange_exec_unique;
CREATE UNIQUE INDEX trades_user_portfolio_exchange_exec_uidx
  ON public.trades (user_id, portfolio_id, exchange_exec_id)
  WHERE exchange_exec_id IS NOT NULL;

-- 7) Auto-provision a default portfolio for any NEW user that signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user_portfolio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.portfolios (user_id, name, currency, starting_balance, is_default, sort_order)
  VALUES (new.id, 'My Portfolio', 'USD', 0, true, 0)
  ON CONFLICT DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_portfolio ON auth.users;
CREATE TRIGGER on_auth_user_created_portfolio
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_portfolio();