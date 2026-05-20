CREATE OR REPLACE FUNCTION public.backfill_trade_provenance(p_batch int DEFAULT 500)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  WITH targets AS (
    SELECT id FROM public.trades
    WHERE broker_id IS NULL
    ORDER BY id
    LIMIT GREATEST(p_batch, 1)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.trades t SET
    broker_id     = COALESCE(
                      NULLIF(t.data->>'exchange_provider', ''),
                      substring(t.data->>'comments' FROM 'Broker:([a-z0-9_-]+)'),
                      'manual'
                    ),
    source_type   = CASE
                      WHEN NULLIF(t.data->>'exchange_provider','') IS NOT NULL THEN 'api_sync'
                      WHEN t.data->>'comments' LIKE 'Broker:%'                 THEN 'csv_import'
                      ELSE 'manual'
                    END,
    asset_class   = CASE
                      WHEN NULLIF(t.data->>'exchange_provider','') IN ('bybit','binance','okx','bitget','coinbase','kraken')
                        THEN 'crypto'
                      ELSE COALESCE(t.asset_class, 'other')
                    END,
    external_id   = NULLIF(t.data->>'exchange_exec_id',''),
    -- `data->>'date'` is the legacy "YYYY-MM-DD HH:mm" string from the journal.
    closed_at     = NULLIF(t.data->>'date','')::timestamptz,
    opened_at     = NULLIF(t.data->>'date','')::timestamptz
  FROM targets
  WHERE t.id = targets.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END $$;

-- Lock down execution: only the service role / definer-context callers may run it.
REVOKE EXECUTE ON FUNCTION public.backfill_trade_provenance(int) FROM PUBLIC, anon, authenticated;