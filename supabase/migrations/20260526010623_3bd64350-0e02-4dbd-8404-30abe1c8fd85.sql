
-- handle_new_subscription is a trigger-only function; no API caller should reach it.
revoke all on function public.handle_new_subscription() from public, anon, authenticated;
