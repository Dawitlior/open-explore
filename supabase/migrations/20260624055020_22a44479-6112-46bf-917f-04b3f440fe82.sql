-- Stage 0.4 retry: vault-store trigger blocked the previous backfill UPDATE.
-- Disable user triggers on exchange_credentials only for the backfill statements.

ALTER TABLE public.exchange_credentials
  ADD COLUMN portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE;

INSERT INTO public.portfolios (user_id, name, currency, starting_balance, is_default, sort_order)
SELECT DISTINCT ec.user_id, 'My Portfolio', 'USD', 0, true, 0
FROM public.exchange_credentials ec
WHERE NOT EXISTS (SELECT 1 FROM public.portfolios p WHERE p.user_id = ec.user_id);

ALTER TABLE public.exchange_credentials DISABLE TRIGGER USER;

UPDATE public.exchange_credentials ec
SET portfolio_id = resolved.pid
FROM (
  SELECT DISTINCT ON (p.user_id)
         p.user_id,
         p.id AS pid
  FROM public.portfolios p
  ORDER BY p.user_id, p.is_default DESC, p.created_at ASC
) resolved
WHERE ec.user_id = resolved.user_id
  AND ec.portfolio_id IS NULL;

ALTER TABLE public.exchange_credentials ENABLE TRIGGER USER;

-- Backfill synced trades (currently 0 rows but defensive)
UPDATE public.trades t
SET portfolio_id = ec.portfolio_id
FROM public.exchange_credentials ec
WHERE t.user_id = ec.user_id
  AND t.source_type = 'api_sync'
  AND lower(coalesce(t.broker_id,'')) = lower(ec.provider)
  AND coalesce(t.account_label,'') = coalesce(ec.label,'')
  AND ec.portfolio_id IS NOT NULL
  AND t.portfolio_id IS DISTINCT FROM ec.portfolio_id;

DO $$
DECLARE n_null int;
BEGIN
  SELECT COUNT(*) INTO n_null FROM public.exchange_credentials WHERE portfolio_id IS NULL;
  IF n_null > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % credentials still have NULL portfolio_id', n_null;
  END IF;
END $$;

ALTER TABLE public.exchange_credentials
  ALTER COLUMN portfolio_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exchange_credentials_portfolio_id
  ON public.exchange_credentials(portfolio_id);