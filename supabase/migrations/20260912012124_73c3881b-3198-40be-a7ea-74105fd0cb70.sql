create or replace function public.consume_ai_chat_message(p_user uuid, p_period text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_cap integer := coalesce(p_limit, 2147483647);
begin
  if auth.uid() is not null and p_user is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.ai_chat_usage as u (user_id, period, message_count, updated_at)
  values (p_user, p_period, 1, now())
  on conflict (user_id, period) do update
     set message_count = u.message_count + 1,
         updated_at = now()
   where u.message_count < v_cap
  returning u.message_count into v_count;

  -- NULL means the atomic update was skipped because the cap was already reached.
  return v_count;
end;
$$;

grant execute on function public.consume_ai_chat_message(uuid, text, integer) to authenticated, service_role;