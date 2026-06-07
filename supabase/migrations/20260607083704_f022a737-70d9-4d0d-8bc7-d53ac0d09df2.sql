
CREATE OR REPLACE FUNCTION public.current_entitlement(p_user uuid)
RETURNS app_tier
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  s public.subscriptions;
begin
  -- Authenticated users may only query their own entitlement.
  -- service_role bypasses this check (used by webhooks / edge functions).
  if auth.uid() is not null and p_user is distinct from auth.uid() then
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
