-- Phase 0: Additive columns for Broker-Agnostic engine. All nullable, no constraints yet.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS broker_id      text,
  ADD COLUMN IF NOT EXISTS account_label  text,
  ADD COLUMN IF NOT EXISTS source_type    text,
  ADD COLUMN IF NOT EXISTS asset_class    text,
  ADD COLUMN IF NOT EXISTS external_id    text,
  ADD COLUMN IF NOT EXISTS opened_at      timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at      timestamptz;

-- Soft check constraint (validated, not enforced strictly until Phase 5)
ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_source_type_check;
ALTER TABLE public.trades
  ADD CONSTRAINT trades_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('api_sync','csv_import','manual'));

-- Indexes for the queries we'll actually run
CREATE INDEX IF NOT EXISTS trades_user_broker_idx
  ON public.trades(user_id, broker_id);

CREATE INDEX IF NOT EXISTS trades_user_closedat_idx
  ON public.trades(user_id, closed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS trades_user_external_uidx
  ON public.trades(user_id, broker_id, account_label, external_id)
  WHERE external_id IS NOT NULL;

-- Same provenance on open_positions so multi-account live data is unambiguous
ALTER TABLE public.open_positions
  ADD COLUMN IF NOT EXISTS account_label text;