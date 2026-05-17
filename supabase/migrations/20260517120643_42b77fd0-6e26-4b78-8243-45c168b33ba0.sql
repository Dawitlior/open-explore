-- Generated column surfaces the exchange execution id out of the jsonb data
-- so PostgREST upserts can target it as an ON CONFLICT column.
alter table public.trades
  add column if not exists exchange_exec_id text
  generated always as (nullif(data->>'exchange_exec_id', '')) stored;

-- Partial unique index: only enforced for rows that originated from an exchange sync.
-- (Manual trades have a null exchange_exec_id and are not constrained.)
create unique index if not exists trades_user_exchange_exec_id_uidx
  on public.trades(user_id, exchange_exec_id)
  where exchange_exec_id is not null;