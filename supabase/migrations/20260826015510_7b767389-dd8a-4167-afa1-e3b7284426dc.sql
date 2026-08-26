create or replace function public.trader_code(uid uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare v_salt text;
begin
  select decrypted_secret into v_salt from vault.decrypted_secrets where name = 'trader_salt' limit 1;
  if v_salt is null or length(v_salt) < 16 then
    raise exception 'trader_salt secret missing or too weak' using errcode = '42501';
  end if;
  return 'TRD-' || upper(substr(encode(extensions.hmac(uid::text, v_salt, 'sha256'), 'hex'), 1, 6));
end;
$fn$;