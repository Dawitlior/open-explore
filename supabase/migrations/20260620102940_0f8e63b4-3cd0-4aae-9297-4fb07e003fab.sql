
-- =====================================================================
-- ORCA Console · Wave 1
-- A. Foundation (trader_code) · B. ai_runs + benchmark_opt_in
-- C. 4 finalized RPCs (db_storage, ai_usage, active_count, subscriptions)
-- All admin RPCs gate via public.has_role(auth.uid(), 'admin').
-- =====================================================================

-- ============ A. FOUNDATION ============
create extension if not exists pgcrypto;

create or replace function public.trader_code(uid uuid)
returns text
language sql security definer stable set search_path = public as $$
  select 'TRD-' || upper(substr(encode(
    extensions.hmac(
      uid::text,
      coalesce(current_setting('app.trader_salt', true), 'CHANGE-ME-SET-A-REAL-SALT'),
      'sha256'
    ),
    'hex'), 1, 6));
$$;

revoke all on function public.trader_code(uuid) from public;
grant execute on function public.trader_code(uuid) to authenticated, service_role;


-- ============ B1. AI USAGE LOG ============
create table if not exists public.ai_runs (
  id                bigint generated always as identity primary key,
  user_id           uuid,
  feature           text not null check (feature in ('coach','review','insights','other')),
  model             text,
  prompt_tokens     int not null default 0,
  completion_tokens int not null default 0,
  cost_usd          numeric(10,4) not null default 0,
  latency_ms        int,
  created_at        timestamptz not null default now()
);

grant select, insert on public.ai_runs to authenticated;
grant all on public.ai_runs to service_role;

alter table public.ai_runs enable row level security;

create policy ai_runs_own_select on public.ai_runs
  for select to authenticated using (user_id = auth.uid());

create policy ai_runs_own_insert on public.ai_runs
  for insert to authenticated with check (user_id = auth.uid());

create index if not exists ai_runs_created_idx on public.ai_runs (created_at);
create index if not exists ai_runs_feature_idx on public.ai_runs (feature, created_at);


-- ============ B2. BENCHMARK CONSENT ============
alter table public.user_preferences
  add column if not exists benchmark_opt_in boolean not null default false;


-- ============ C1. admin_db_storage ============
create or replace function public.admin_db_storage()
returns table(table_name text, size_bytes bigint, row_estimate bigint,
              db_size_bytes bigint, connections int, cache_hit_ratio numeric)
language plpgsql security definer set search_path = public as $$
declare v_db bigint; v_conn int; v_cache numeric;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select pg_database_size(current_database()) into v_db;
  select count(*) into v_conn from pg_stat_activity where datname = current_database();
  select round(sum(heap_blks_hit)::numeric / nullif(sum(heap_blks_hit + heap_blks_read), 0) * 100, 1)
    into v_cache from pg_statio_user_tables;
  return query
  select c.relname::text, pg_total_relation_size(c.oid)::bigint, c.reltuples::bigint, v_db, v_conn, v_cache
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by pg_total_relation_size(c.oid) desc;
end; $$;

revoke all on function public.admin_db_storage() from public;
grant execute on function public.admin_db_storage() to authenticated;


-- ============ C2. admin_ai_usage ============
create or replace function public.admin_ai_usage(p_period int default 90, p_feature text default null)
returns table(week date, feature text, tokens bigint, calls bigint,
              cost_usd numeric, avg_latency_ms int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select date_trunc('week', r.created_at)::date as week,
         r.feature,
         sum(r.prompt_tokens + r.completion_tokens)::bigint as tokens,
         count(*)::bigint as calls,
         sum(r.cost_usd) as cost_usd,
         avg(r.latency_ms)::int as avg_latency_ms
  from public.ai_runs r
  where r.created_at >= now() - (p_period || ' days')::interval
    and (p_feature is null or r.feature = p_feature)
  group by 1, 2 order by 1, 2;
end; $$;

revoke all on function public.admin_ai_usage(int, text) from public;
grant execute on function public.admin_ai_usage(int, text) to authenticated;


-- ============ C3. admin_active_count ============
-- Proxy for DAU until a dedicated activity_events table exists.
create or replace function public.admin_active_count(p_window int default 1)
returns int
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return (
    select count(distinct uid) from (
      select user_id as uid from public.trades
        where opened_at >= now() - (p_window || ' days')::interval
      union
      select user_id from public.bug_reports
        where created_at >= now() - (p_window || ' days')::interval
      union
      select user_id from public.trader_mind_sessions
        where created_at >= now() - (p_window || ' days')::interval
    ) u where uid is not null
  );
end; $$;

revoke all on function public.admin_active_count(int) from public;
grant execute on function public.admin_active_count(int) to authenticated;


-- ============ C4. admin_subscriptions ============
create or replace function public.admin_subscriptions()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'tierMix', coalesce((
      select jsonb_agg(jsonb_build_object('tier', t, 'n', c) order by t)
      from (
        select public.current_entitlement(s.user_id)::text as t, count(*) as c
        from public.subscriptions s group by 1
      ) a
    ), '[]'::jsonb),
    'stateMix', coalesce((
      select jsonb_agg(jsonb_build_object('status', st, 'n', c) order by st)
      from (
        select s.status::text as st, count(*) as c
        from public.subscriptions s group by 1
      ) b
    ), '[]'::jsonb)
  ) into res;
  return res;
end; $$;

revoke all on function public.admin_subscriptions() from public;
grant execute on function public.admin_subscriptions() to authenticated;
