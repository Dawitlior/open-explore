create or replace function public.admin_sanity_counts()
returns table(users int, traders_with_trades int, total_trades int, subscriptions int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'not authorized' using errcode='42501'; end if;
  return query select
    (select count(*) from public.profiles)::int,
    (select count(distinct user_id) from public.trades)::int,
    (select count(*) from public.trades)::int,
    (select count(*) from public.subscriptions)::int;
end; $$;
revoke all on function public.admin_sanity_counts() from public;
grant execute on function public.admin_sanity_counts() to authenticated;