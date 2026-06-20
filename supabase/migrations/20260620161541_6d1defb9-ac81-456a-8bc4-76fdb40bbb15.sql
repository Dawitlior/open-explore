CREATE OR REPLACE FUNCTION public._orca_trader_rollup()
RETURNS TABLE (
  uid uuid, code text, archetype text, tier text, tier_weight int,
  trades_total int, expectancy numeric, win_rate numeric,
  last_active_days int, tenure_days int, sessions_wk numeric,
  journal_completion numeric, rules_rate numeric,
  breach_w int, breach_m int, readiness int, prov text,
  discipline int, edge_health int, regime_fit int, orca int,
  retention_risk int, behavioural_risk int, value_potential int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
           count(distinct date(coalesce(closed_at, opened_at)))                       as trade_days,
           max(readiness)                                                             as readiness,
           mode() within group (order by prov)                                        as prov
    from base group by uid
  ),
  jr as (
    select user_id as uid,
           coalesce(jsonb_array_length(state->'days'), 0) as jdays
    from public.journal_state
  ),
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
           least(1.0, coalesce(j.jdays,0)::numeric / nullif(a.trade_days,0))          as journal_completion,
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
    r.sessions_wk, round(coalesce(r.journal_completion,0),2), round(r.rules_rate,2), r.breach_w, r.breach_m,
    r.readiness, r.prov,
    greatest(0, least(100, round( r.rules_rate*60 + coalesce(r.journal_completion,0)*25 + 15 )))::int                       as discipline,
    greatest(0, least(100, round( 50 + r.expectancy*30 + (r.win_rate-0.5)*40 )))::int                                       as edge_health,
    greatest(0, least(100, round( 50 + (r.win_rate-0.5)*30 )))::int                                                         as regime_fit,
    0 as orca,
    greatest(0, least(100, round( r.last_active_days*3.2 + (case when r.sessions_wk<1.5 then 22 else 0 end)
            + (case when r.trades_total<45 then 16 else 0 end) + (1-coalesce(r.journal_completion,0))*24
            - (case lower(r.tier) when 'standard' then 1 when 'advanced' then 2 when 'ultimate' then 3 else 1 end)*4 )))::int as retention_risk,
    greatest(0, least(100, round( (r.breach_w+r.breach_m)*8 - r.rules_rate*16
            + (case when r.expectancy<0 then 18 else 0 end) )))::int                                                        as behavioural_risk,
    greatest(0, least(100, round( (case when r.expectancy>0 then 34 + r.expectancy*28 else 8 end)
            + r.rules_rate*20 + coalesce(r.journal_completion,0)*16 + least(r.tenure_days/560.0,1)*14
            + (case lower(r.tier) when 'standard' then 1 when 'advanced' then 2 when 'ultimate' then 3 else 1 end)*4 )))::int as value_potential
  from roll r;
$$;