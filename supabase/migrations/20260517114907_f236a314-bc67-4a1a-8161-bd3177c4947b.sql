-- Read-only helper that returns the decrypted api_secret for a credential row
-- belonging to a specific user. SECURITY DEFINER lets the edge function reach
-- vault.decrypted_secrets without exposing the vault schema to PostgREST.
-- The function is locked down to service_role to prevent client abuse.

create or replace function public.read_exchange_secret(p_user_id uuid, p_cred_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
  v_plain     text;
begin
  -- Ownership gate: the credential must belong to the supplied user.
  select secret_id
    into v_secret_id
    from public.exchange_credentials
   where id = p_cred_id
     and user_id = p_user_id
   limit 1;

  if v_secret_id is null then
    return null;
  end if;

  select decrypted_secret
    into v_plain
    from vault.decrypted_secrets
   where id = v_secret_id
   limit 1;

  return v_plain;
end;
$$;

-- Lock it down: only the service role (used by edge functions) may call it.
revoke all on function public.read_exchange_secret(uuid, uuid) from public, anon, authenticated;
grant execute on function public.read_exchange_secret(uuid, uuid) to service_role;