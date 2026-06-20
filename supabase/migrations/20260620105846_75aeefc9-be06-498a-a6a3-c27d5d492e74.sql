
-- 1) Grant admin role to owner
insert into public.user_roles (user_id, role)
values ('8e6cab09-e03d-4a89-8a08-dbe6a3864362', 'admin')
on conflict (user_id, role) do nothing;

-- 2) Create a stable random salt in Vault (only if missing)
do $$
declare v_exists uuid;
begin
  select id into v_exists from vault.secrets where name = 'trader_salt' limit 1;
  if v_exists is null then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'trader_salt', 'HMAC salt for trader_code pseudonymization');
  end if;
end $$;

-- 3) Switch trader_code() to read salt from Vault
create or replace function public.trader_code(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'TRD-' || upper(substr(encode(
    extensions.hmac(
      uid::text,
      coalesce(
        (select decrypted_secret from vault.decrypted_secrets where name = 'trader_salt' limit 1),
        'CHANGE-ME-SET-A-REAL-SALT'
      ),
      'sha256'
    ),
    'hex'), 1, 6));
$$;
