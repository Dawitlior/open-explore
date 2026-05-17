-- Drop the previous partial unique index (cannot be used as ON CONFLICT target)
DROP INDEX IF EXISTS public.trades_user_exchange_exec_id_uidx;

-- Drop the constraint if it somehow already exists (idempotent re-run safety)
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_user_exchange_exec_unique;

-- Add the formal table-level composite UNIQUE constraint.
-- NULL exchange_exec_id values (manual trades) remain unconstrained per SQL NULL semantics.
ALTER TABLE public.trades
  ADD CONSTRAINT trades_user_exchange_exec_unique UNIQUE (user_id, exchange_exec_id);