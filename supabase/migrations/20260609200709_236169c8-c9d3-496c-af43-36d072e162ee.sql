create table public.trader_mind_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  archetype text,
  version text not null default 'v1',
  payload jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.trader_mind_sessions to authenticated;
grant all on public.trader_mind_sessions to service_role;

alter table public.trader_mind_sessions enable row level security;

create policy "Users read own trader_mind sessions"
  on public.trader_mind_sessions for select to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own trader_mind sessions"
  on public.trader_mind_sessions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own trader_mind sessions"
  on public.trader_mind_sessions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users delete own trader_mind sessions"
  on public.trader_mind_sessions for delete to authenticated
  using (auth.uid() = user_id);

create index trader_mind_sessions_user_completed_idx
  on public.trader_mind_sessions (user_id, completed_at desc);

create trigger trader_mind_sessions_touch
  before update on public.trader_mind_sessions
  for each row execute function public.touch_updated_at();