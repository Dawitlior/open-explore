
-- ============ SHARED PER-TRADER ROLLUP ============
create or replace function public._orca_trader_rollup()
returns table(
  uid uuid, code text, archetype text, tier text, tier_weight int,
  trades_total int, expectancy numeric, win_rate numeric, last_active_days int, tenure_days int,
  sessions_wk numeric, journal_completion numeric, rules_rate numeric, breach_w int, breach_m int,
  readiness int, prov text,
  discipline int, edge_health int, regime_fit int, orca int,
  retention_risk int, behavioural_risk int, value_potential int)
language sql security definer stable set search_path = public as $$
  with
  base as (
    select t.user_id as uid,
           coalesce(t.manual_r_multiple,
                    nullif(t.data->>'returnR','')::numeric,
                    nullif(t.data->>'r_multiple','')::numeric)                       as r,
           t.opened_at, t.closed_at,
           lower(coalesce(t.data->>'rules',''))                                       as rules_raw,
           coalesce(t.asset_class, t.data->>'asset_class', 'unknown')                 as asset,
           nullif(t.data->>'readiness','')::int                                       as readiness,
           coalesce(t.source_type, 'manual')                                          as prov
    from public.trades t
  ),
  agg as (
    select uid,
           count(*)::int                                                              as trades_total,
           avg(r) filter (where closed_at is not null)                                as expectancy,
           avg((r>0)::int) filter (where closed_at is not null and r is not null)    as win_rate,
           avg(case when rules_raw in ('true','t','1','yes') then 1
                    when rules_raw in ('false','f','0','no') then 0 end)              as rules_rate_raw,
           coalesce(extract(day from now() - max(coalesce(closed_at, opened_at)))::int, 999) as last_active_days,
           coalesce(extract(day from now() - min(opened_at))::int, 0)                 as tenure_days,
           greatest(count(distinct date_trunc('week', opened_at)), 1)                 as active_weeks,
           max(readiness)                                                             as readiness,
           mode() within group (order by prov)                                        as prov
    from base group by uid
  ),
  jr as ( select user_id as uid, 1 as jcount from public.journal_state ),
  prefs as ( select user_id as uid, weekly_risk_limit, monthly_risk_limit from public.user_preferences ),
  wk as ( select user_id as uid, date_trunc('week', closed_at) as p,
                 sum(coalesce(manual_r_multiple,
                              nullif(data->>'returnR','')::numeric,
                              nullif(data->>'r_multiple','')::numeric)) as s
          from public.trades where closed_at is not null group by 1,2 ),
  mo as ( select user_id as uid, date_trunc('month', closed_at) as p,
                 sum(coalesce(manual_r_multiple,
                              nullif(data->>'returnR','')::numeric,
                              nullif(data->>'r_multiple','')::numeric)) as s
          from public.trades where closed_at is not null group by 1,2 ),
  arch as ( select distinct on (user_id) user_id as uid, archetype
            from public.trader_mind_sessions order by user_id, created_at desc ),
  roll as (
    select a.uid,
           coalesce(ar.archetype, 'unprofiled')                                       as archetype,
           public.current_entitlement(a.uid)::text                                    as tier,
           a.trades_total,
           round(coalesce(a.expectancy,0), 3)                                         as expectancy,
           round(coalesce(a.win_rate,0), 3)                                           as win_rate,
           a.last_active_days, a.tenure_days,
           round(a.trades_total::numeric / a.active_weeks, 2)                         as sessions_wk,
           least(1.0, coalesce(j.jcount,0)::numeric / nullif(a.trades_total,0))       as journal_completion,
           coalesce(a.rules_rate_raw, 0.7)                                            as rules_rate,
           (select count(*) from wk where wk.uid=a.uid and wk.s <= -coalesce(p.weekly_risk_limit,5))::int  as breach_w,
           (select count(*) from mo where mo.uid=a.uid and mo.s <= -coalesce(p.monthly_risk_limit,10))::int as breach_m,
           coalesce(a.readiness, 100)                                                 as readiness,
           a.prov
    from agg a
    left join arch ar on ar.uid=a.uid
    left join jr   j  on j.uid=a.uid
    left join prefs p on p.uid=a.uid
  )
  select
    r.uid, public.trader_code(r.uid) as code, r.archetype, r.tier,
    (case lower(r.tier) when 'standard' then 1 when 'advanced' then 2 when 'ultimate' then 3 else 1 end) as tier_weight,
    r.trades_total, r.expectancy, r.win_rate, r.last_active_days, r.tenure_days,
    r.sessions_wk, round(r.journal_completion,2), round(r.rules_rate,2), r.breach_w, r.breach_m,
    r.readiness, r.prov,
    greatest(0, least(100, round( r.rules_rate*60 + r.journal_completion*25 + 15 )))::int                                   as discipline,
    greatest(0, least(100, round( 50 + r.expectancy*30 + (r.win_rate-0.5)*40 )))::int                                       as edge_health,
    greatest(0, least(100, round( 50 + (r.win_rate-0.5)*30 )))::int                                                         as regime_fit,
    0 as orca,
    greatest(0, least(100, round( r.last_active_days*3.2 + (case when r.sessions_wk<1.5 then 22 else 0 end)
            + (case when r.trades_total<45 then 16 else 0 end) + (1-r.journal_completion)*24
            - (case lower(r.tier) when 'standard' then 1 when 'advanced' then 2 when 'ultimate' then 3 else 1 end)*4 )))::int as retention_risk,
    greatest(0, least(100, round( (r.breach_w+r.breach_m)*8 - r.rules_rate*16
            + (case when r.expectancy<0 then 18 else 0 end) )))::int                                                        as behavioural_risk,
    greatest(0, least(100, round( (case when r.expectancy>0 then 34 + r.expectancy*28 else 8 end)
            + r.rules_rate*20 + r.journal_completion*16 + least(r.tenure_days/560.0,1)*14
            + (case lower(r.tier) when 'standard' then 1 when 'advanced' then 2 when 'ultimate' then 3 else 1 end)*4 )))::int as value_potential
  from roll r;
$$;

revoke all on function public._orca_trader_rollup() from public;

-- ============ 1 · admin_trader_matrix ============
create or replace function public.admin_trader_matrix(
  p_sort text default 'behavioural_risk', p_dir text default 'desc', p_limit int default 25,
  p_tier text default null, p_archetype text default null)
returns table(code text, archetype text, tier text, discipline int, retention_risk int,
              behavioural_risk int, value_potential int, expectancy numeric, sessions_wk numeric, last_active_days int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  return query
  select r.code, r.archetype, r.tier, r.discipline, r.retention_risk, r.behavioural_risk,
         r.value_potential, r.expectancy, r.sessions_wk, r.last_active_days
  from public._orca_trader_rollup() r
  where (p_tier is null or r.tier = p_tier) and (p_archetype is null or r.archetype = p_archetype)
  order by case when p_dir='desc' then
      case p_sort when 'behavioural_risk' then r.behavioural_risk when 'retention_risk' then r.retention_risk
                  when 'value_potential' then r.value_potential when 'discipline' then r.discipline
                  else r.behavioural_risk end end desc nulls last,
    case when p_dir='asc' then
      case p_sort when 'behavioural_risk' then r.behavioural_risk when 'retention_risk' then r.retention_risk
                  when 'value_potential' then r.value_potential when 'discipline' then r.discipline
                  else r.behavioural_risk end end asc nulls last
  limit greatest(1, least(p_limit, 200));
end; $$;
revoke all on function public.admin_trader_matrix(text,text,int,text,text) from public;
grant execute on function public.admin_trader_matrix(text,text,int,text,text) to authenticated;

-- ============ 2 · admin_trader_mind ============
create or replace function public.admin_trader_mind()
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  with r as (select * from public._orca_trader_rollup())
  select jsonb_build_object(
    'archMix', coalesce((select jsonb_agg(jsonb_build_object('archetype',a,'n',c) order by c desc)
                         from (select archetype a, count(*) c from r group by 1) x), '[]'::jsonb),
    'avgScores', (select jsonb_build_object(
        'discipline', round(avg(discipline)), 'edge_health', round(avg(edge_health)),
        'regime_fit', round(avg(regime_fit)),
        'orca', round(avg(0.34*discipline + 0.26*edge_health + 0.20*(100-behavioural_risk) + 0.20*value_potential))
      ) from r where archetype <> 'unprofiled'),
    'count', (select count(*) from r)
  ) into res;
  return res;
end; $$;
revoke all on function public.admin_trader_mind() from public;
grant execute on function public.admin_trader_mind() to authenticated;

-- ============ 3 · admin_performance ============
create or replace function public.admin_performance(p_archetype text default null, p_tier text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  with r as (select * from public._orca_trader_rollup()
             where (p_archetype is null or archetype = p_archetype) and (p_tier is null or tier = p_tier))
  select jsonb_build_object(
    'avgExpectancy', round(avg(expectancy),3), 'avgWinRate', round(avg(win_rate),3),
    'profitablePct', round(avg((expectancy>0)::int)*100),
    'byArchetype', coalesce((select jsonb_agg(jsonb_build_object('archetype',a,'expectancy',e) order by e desc)
        from (select archetype a, round(avg(expectancy),3) e from r where archetype<>'unprofiled' group by 1) x), '[]'::jsonb),
    'count', (select count(*) from r)
  ) into res from r;
  return res;
end; $$;
revoke all on function public.admin_performance(text,text) from public;
grant execute on function public.admin_performance(text,text) to authenticated;

-- ============ 4 · admin_risk_engine ============
create or replace function public.admin_risk_engine(p_tier text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  with r as (select * from public._orca_trader_rollup() where (p_tier is null or tier = p_tier))
  select jsonb_build_object(
    'breachWeekly', coalesce(sum(breach_w),0), 'breachMonthly', coalesce(sum(breach_m),0),
    'avgDiscipline', round(avg(discipline)), 'avgBehaviouralRisk', round(avg(behavioural_risk)),
    'elevatedRiskTraders', (select count(*) from r where behavioural_risk >= 70),
    'count', (select count(*) from r)
  ) into res from r;
  return res;
end; $$;
revoke all on function public.admin_risk_engine(text) from public;
grant execute on function public.admin_risk_engine(text) to authenticated;

-- ============ 5 · admin_benchmarks ============
create or replace function public.admin_benchmarks(p_kmin int default 25)
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb; v_n int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  select count(*) into v_n from public._orca_trader_rollup() r
    join public.user_preferences up on up.user_id = r.uid
    where up.benchmark_opt_in = true;
  if v_n < p_kmin then
    return jsonb_build_object('suppressed', true, 'n', v_n, 'kmin', p_kmin);
  end if;
  with r as (select rr.* from public._orca_trader_rollup() rr
             join public.user_preferences up on up.user_id = rr.uid where up.benchmark_opt_in = true)
  select jsonb_build_object('suppressed', false, 'n', v_n,
    'avgExpectancy', round(avg(expectancy),3), 'profitablePct', round(avg((expectancy>0)::int)*100),
    'avgDiscipline', round(avg(discipline)), 'avgEdgeHealth', round(avg(edge_health))
  ) into res from r;
  return res;
end; $$;
revoke all on function public.admin_benchmarks(int) from public;
grant execute on function public.admin_benchmarks(int) to authenticated;

-- ============ 6 · admin_engagement_weekly ============
create or replace function public.admin_engagement_weekly(p_period int default 90)
returns table(week date, active bigint, signups bigint, trades bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  return query
  with weeks as (
    select generate_series(date_trunc('week', now() - (p_period||' days')::interval),
                           date_trunc('week', now()), interval '1 week')::date as wk )
  select w.wk,
    (select count(distinct t.user_id) from public.trades t where date_trunc('week',t.opened_at)::date = w.wk) as active,
    (select count(*) from auth.users u where date_trunc('week',u.created_at)::date = w.wk)                     as signups,
    (select count(*) from public.trades t where date_trunc('week',t.opened_at)::date = w.wk)                  as trades
  from weeks w order by w.wk;
end; $$;
revoke all on function public.admin_engagement_weekly(int) from public;
grant execute on function public.admin_engagement_weekly(int) to authenticated;

-- ============ 7 · admin_activity_heatmap ============
create or replace function public.admin_activity_heatmap(p_period int default 90)
returns table(dow int, hour int, n bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  return query
  select extract(dow from opened_at)::int, extract(hour from opened_at)::int, count(*)
  from public.trades
  where opened_at >= now() - (p_period||' days')::interval
  group by 1,2 order by 1,2;
end; $$;
revoke all on function public.admin_activity_heatmap(int) from public;
grant execute on function public.admin_activity_heatmap(int) to authenticated;

-- ============ 8 · admin_retention_cohorts ============
create or replace function public.admin_retention_cohorts(p_cohorts int default 8)
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  with last_act as (
    select user_id as uid, max(opened_at) as last_at, min(opened_at) as first_at from public.trades group by 1 ),
  cohort as (
    select u.id as uid, date_trunc('month', u.created_at)::date as coh,
           greatest(0, (extract(epoch from (coalesce(la.last_at, u.created_at) - u.created_at))/604800)::int) as alive_weeks
    from auth.users u left join last_act la on la.uid = u.id )
  select jsonb_agg(jsonb_build_object('cohort', coh, 'size', sz, 'avg_alive_weeks', aw) order by coh desc)
  into res from (
    select coh, count(*) sz, round(avg(alive_weeks),1) aw from cohort group by 1
    order by coh desc limit p_cohorts ) c;
  return coalesce(res, '[]'::jsonb);
end; $$;
revoke all on function public.admin_retention_cohorts(int) from public;
grant execute on function public.admin_retention_cohorts(int) to authenticated;

-- ============ 9 · admin_activation_funnel ============
create or replace function public.admin_activation_funnel()
returns table(stage text, n bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  return query
  select 'signup'::text,        count(*) from auth.users
  union all
  select 'profiled',            count(distinct user_id) from public.trader_mind_sessions
  union all
  select 'first_trade',         count(distinct user_id) from public.trades
  union all
  select 'active_30d',          count(distinct user_id) from public.trades where opened_at >= now() - interval '30 days';
end; $$;
revoke all on function public.admin_activation_funnel() from public;
grant execute on function public.admin_activation_funnel() to authenticated;

-- ============ 10 · admin_data_quality ============
create or replace function public.admin_data_quality()
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  with r as (select * from public._orca_trader_rollup())
  select jsonb_build_object(
    'avgReadiness', round(avg(readiness)),
    'provMix', coalesce((select jsonb_agg(jsonb_build_object('source',s,'n',c) order by c desc)
                         from (select prov s, count(*) c from r group by 1) x), '[]'::jsonb),
    'readinessBuckets', coalesce((select jsonb_agg(jsonb_build_object('bucket',b*10,'n',c) order by b)
        from (select (readiness/10) b, count(*) c from r group by 1) y), '[]'::jsonb)
  ) into res from r;
  return res;
end; $$;
revoke all on function public.admin_data_quality() from public;
grant execute on function public.admin_data_quality() to authenticated;
