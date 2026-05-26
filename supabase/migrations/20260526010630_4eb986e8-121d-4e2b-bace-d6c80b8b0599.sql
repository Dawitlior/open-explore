
revoke all on function public.current_entitlement(uuid) from public, anon;
grant execute on function public.current_entitlement(uuid) to authenticated;
