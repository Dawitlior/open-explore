create or replace function public.current_entitlement(p_user uuid)
 returns app_tier
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  s public.subscriptions;
begin
  if auth.uid() is not null
     and p_user is distinct from auth.uid()
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden: can only query own entitlement';
  end if;

  select * into s from public.subscriptions where user_id = p_user;
  if not found then
    return 'standard'::public.app_tier;
  end if;

  if s.grandfathered then
    return s.tier;
  end if;

  -- Paid access is valid only while the purchased period is still running.
  if s.status = 'active'
     and (s.current_period_end is null or s.current_period_end > now()) then
    return s.tier;
  end if;

  -- Cancelled but already paid for the running period: keep access till the end.
  if s.status = 'canceled'
     and s.current_period_end is not null
     and s.current_period_end > now() then
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

  return 'standard'::public.app_tier;
end;
$function$;