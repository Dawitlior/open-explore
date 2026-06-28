CREATE OR REPLACE FUNCTION public.current_entitlement(p_user uuid)
RETURNS public.app_tier
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  s public.subscriptions;
begin
  -- Authenticated users may query only their own entitlement.
  -- Admins may query all entitlements for the admin console rollups.
  if auth.uid() is not null
     and p_user is distinct from auth.uid()
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden: can only query own entitlement';
  end if;

  select * into s from public.subscriptions where user_id = p_user;
  if not found then
    return 'standard'::public.app_tier;
  end if;

  if s.status = 'active' then
    return s.tier;
  end if;

  if s.status = 'trialing' and s.trial_ends_at > now() then
    return 'advanced'::public.app_tier;
  end if;

  if s.status = 'past_due'
     and s.current_period_end is not null
     and s.current_period_end + interval '3 days' > now() then
    return s.tier;
  end if;

  if s.grandfathered then
    return s.tier;
  end if;

  return 'standard'::public.app_tier;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_active_count(p_window integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return (
    select count(distinct uid) from (
      select user_id as uid from public.trades
        where opened_at >= now() - (p_window || ' days')::interval
      union
      select created_by as uid from public.bug_reports
        where created_at >= now() - (p_window || ' days')::interval
      union
      select user_id as uid from public.trader_mind_sessions
        where created_at >= now() - (p_window || ' days')::interval
    ) u where uid is not null
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_trader_matrix_full(p_sort text DEFAULT 'behavioural_risk'::text, p_dir text DEFAULT 'desc'::text, p_limit integer DEFAULT 500, p_tier text DEFAULT NULL::text, p_archetype text DEFAULT NULL::text)
RETURNS TABLE(code text, archetype text, tier text, discipline integer, retention_risk integer, behavioural_risk integer, value_potential integer, expectancy numeric, win_rate numeric, sessions_wk numeric, last_active_days integer, asset_class text, source_type text, readiness integer, sub_status text, breach_trade integer, breach_daily integer, breach_weekly integer, breach_monthly integer, exp_slope numeric, revenge_rate numeric, over_z numeric, exp_trend numeric[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  return query
  with
  r as ( select * from public._orca_trader_rollup() ),
  prefs as ( select user_id as uid, coalesce(daily_risk_limit, 1) as dlim
             from public.user_preferences ),
  daily as ( select user_id as uid, date_trunc('day', closed_at) as d,
                    sum(coalesce(manual_r_multiple, nullif(data->>'returnR','')::numeric, nullif(data->>'r_multiple','')::numeric)) as s
             from public.trades where closed_at is not null group by 1,2 ),
  bd as ( select dy.uid, count(*)::int as breach_daily
          from daily dy left join prefs p on p.uid = dy.uid
          where dy.s <= -coalesce(p.dlim,1) group by 1 ),
  ex as ( select t.user_id as uid,
                 mode() within group (order by t.asset_class) as asset_class,
                 mode() within group (order by t.source_type) as source_type,
                 max(nullif(t.data->>'readiness','')::int)    as readiness
          from public.trades t group by 1 ),
  subs as ( select distinct on (user_id) user_id as uid, status::text as sub_status
            from public.subscriptions order by user_id, current_period_end desc nulls last ),
  et as ( select uid, array_agg(round(avg_r,3) order by wk) as exp_trend
          from ( select user_id as uid, date_trunc('week', closed_at) as wk,
                        avg(coalesce(manual_r_multiple, nullif(data->>'returnR','')::numeric, nullif(data->>'r_multiple','')::numeric)) as avg_r
                 from public.trades
                 where closed_at is not null and closed_at >= now() - interval '12 weeks'
                 group by 1,2 ) z group by uid ),
  sl as ( select uid, regr_slope(avg_r, wkidx) as exp_slope
          from ( select user_id as uid,
                        (extract(epoch from date_trunc('week', closed_at))/604800)::numeric as wkidx,
                        avg(coalesce(manual_r_multiple, nullif(data->>'returnR','')::numeric, nullif(data->>'r_multiple','')::numeric)) as avg_r
                 from public.trades where closed_at is not null group by 1,2 ) z group by uid ),
  rv as ( select uid, avg(case when prev_loss and gap_min is not null and gap_min < 60 then 1 else 0 end)::numeric as revenge_rate
          from ( select user_id as uid,
                        lag((coalesce(manual_r_multiple, nullif(data->>'returnR','')::numeric, nullif(data->>'r_multiple','')::numeric) < 0)) over w as prev_loss,
                        extract(epoch from (opened_at - lag(closed_at) over w))/60 as gap_min
                 from public.trades where closed_at is not null
                 window w as (partition by user_id order by opened_at) ) z group by uid )
  select
    r.code, r.archetype, r.tier, r.discipline, r.retention_risk, r.behavioural_risk, r.value_potential,
    r.expectancy, r.win_rate, r.sessions_wk, r.last_active_days,
    coalesce(ex.asset_class,'unknown'), coalesce(ex.source_type,'manual'), coalesce(ex.readiness,100),
    coalesce(subs.sub_status,'active'),
    0 as breach_trade, coalesce(bd.breach_daily,0), r.breach_w, r.breach_m,
    round(coalesce(sl.exp_slope,0)::numeric,4), round(coalesce(rv.revenge_rate,0)::numeric,3), 0::numeric as over_z,
    coalesce(et.exp_trend, '{}')
  from r
  left join ex   on ex.uid   = r.uid
  left join subs on subs.uid = r.uid
  left join bd   on bd.uid   = r.uid
  left join et   on et.uid   = r.uid
  left join sl   on sl.uid   = r.uid
  left join rv   on rv.uid   = r.uid
  where (p_tier is null or r.tier = p_tier) and (p_archetype is null or r.archetype = p_archetype)
  order by
    (case when p_dir='desc' then (case p_sort when 'behavioural_risk' then r.behavioural_risk
        when 'retention_risk' then r.retention_risk when 'value_potential' then r.value_potential
        when 'discipline' then r.discipline else r.behavioural_risk end) end) desc nulls last,
    (case when p_dir='asc'  then (case p_sort when 'behavioural_risk' then r.behavioural_risk
        when 'retention_risk' then r.retention_risk when 'value_potential' then r.value_potential
        when 'discipline' then r.discipline else r.behavioural_risk end) end) asc nulls last
  limit greatest(1, least(p_limit, 1000));
end;
$function$;