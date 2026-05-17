-- Open positions table for live Bybit positions snapshot
create table if not exists public.open_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null default 'bybit',
  symbol text not null,
  side text not null,
  size numeric not null default 0,
  entry_price numeric not null default 0,
  unrealized_pnl numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, provider, symbol)
);

alter table public.open_positions enable row level security;

drop policy if exists open_positions_select_own on public.open_positions;
create policy open_positions_select_own on public.open_positions
  for select using (auth.uid() = user_id);

drop policy if exists open_positions_insert_own on public.open_positions;
create policy open_positions_insert_own on public.open_positions
  for insert with check (auth.uid() = user_id);

drop policy if exists open_positions_update_own on public.open_positions;
create policy open_positions_update_own on public.open_positions
  for update using (auth.uid() = user_id);

drop policy if exists open_positions_delete_own on public.open_positions;
create policy open_positions_delete_own on public.open_positions
  for delete using (auth.uid() = user_id);

create index if not exists open_positions_user_idx on public.open_positions(user_id);