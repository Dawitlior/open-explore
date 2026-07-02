-- 1) risk_events table -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'kill_switch_on','kill_switch_off',
    'daily_breach','weekly_breach','monthly_breach'
  )),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.risk_events TO authenticated;
GRANT ALL ON public.risk_events TO service_role;

ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own risk events — insert"
  ON public.risk_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own risk events — read"
  ON public.risk_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS risk_events_user_type_time_idx
  ON public.risk_events (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS risk_events_type_time_idx
  ON public.risk_events (event_type, created_at DESC);

-- 2) admin_risk_engine — real kill/recovery from risk_events -----------------
CREATE OR REPLACE FUNCTION public.admin_risk_engine(p_tier text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  res jsonb;
  v_kill_on int;
  v_avg_recovery_min numeric;
  v_events_total int;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'not authorized' using errcode='42501';
  end if;

  -- Aggregate kill-switch counts across all traders in the last 90 days.
  select count(*) into v_kill_on
  from public.risk_events
  where event_type = 'kill_switch_on'
    and created_at >= now() - interval '90 days';

  -- Recovery = median minutes between a kill_switch_on and the next
  -- kill_switch_off for the same user. NULL if no matched pair exists.
  with pairs as (
    select
      r1.user_id,
      r1.created_at as on_at,
      (
        select min(r2.created_at)
        from public.risk_events r2
        where r2.user_id = r1.user_id
          and r2.event_type = 'kill_switch_off'
          and r2.created_at > r1.created_at
      ) as off_at
    from public.risk_events r1
    where r1.event_type = 'kill_switch_on'
      and r1.created_at >= now() - interval '90 days'
  )
  select round(
    percentile_cont(0.5) within group (
      order by extract(epoch from (off_at - on_at)) / 60
    )::numeric, 1
  )
  into v_avg_recovery_min
  from pairs
  where off_at is not null;

  select count(*) into v_events_total
  from public.risk_events
  where created_at >= now() - interval '90 days';

  with r as (
    select * from public._orca_trader_rollup()
    where (p_tier is null or tier = p_tier)
  )
  select jsonb_build_object(
    'breachWeekly',        coalesce(sum(breach_w), 0),
    'breachMonthly',       coalesce(sum(breach_m), 0),
    'avgDiscipline',       round(avg(discipline)),
    'avgBehaviouralRisk',  round(avg(behavioural_risk)),
    'elevatedRiskTraders', (select count(*) from r where behavioural_risk >= 70),
    'count',               (select count(*) from r),
    -- Kill-switch signals sourced from the risk_events audit trail.
    'killOnCount',         coalesce(v_kill_on, 0),
    'avgRecoveryMinutes',  v_avg_recovery_min,
    'riskEventsTotal',     coalesce(v_events_total, 0),
    'hasKillData',         coalesce(v_events_total, 0) > 0
  ) into res
  from r;

  return res;
end;
$function$;