-- Ensure required extensions
create extension if not exists pgcrypto with schema public;
create extension if not exists supabase_vault with schema vault;

-- Allowed read-only scopes (whitelist)
create table if not exists public.exchange_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  provider text not null,
  label text,
  api_key text not null,
  secret_id uuid not null,
  scope text not null default 'read_only',
  is_active boolean not null default true,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exchange_credentials_scope_chk
    check (scope in ('read_only','history','read-only','readonly')),
  constraint exchange_credentials_provider_chk
    check (char_length(provider) between 2 and 64),
  constraint exchange_credentials_api_key_chk
    check (char_length(api_key) between 4 and 256),
  constraint exchange_credentials_user_provider_label_uniq
    unique (user_id, provider, label)
);

-- Helpful index
create index if not exists exchange_credentials_user_idx
  on public.exchange_credentials(user_id);

-- Enable strict RLS
alter table public.exchange_credentials enable row level security;
alter table public.exchange_credentials force row level security;

-- Per-user isolation policies
drop policy if exists exchange_credentials_select_own on public.exchange_credentials;
create policy exchange_credentials_select_own
  on public.exchange_credentials for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists exchange_credentials_insert_own on public.exchange_credentials;
create policy exchange_credentials_insert_own
  on public.exchange_credentials for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists exchange_credentials_update_own on public.exchange_credentials;
create policy exchange_credentials_update_own
  on public.exchange_credentials for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists exchange_credentials_delete_own on public.exchange_credentials;
create policy exchange_credentials_delete_own
  on public.exchange_credentials for delete
  to authenticated
  using (auth.uid() = user_id);

-- Touch updated_at
drop trigger if exists exchange_credentials_touch_updated_at on public.exchange_credentials;
create trigger exchange_credentials_touch_updated_at
  before update on public.exchange_credentials
  for each row execute function public.touch_updated_at();

-- =========================================================
-- Vault-backed secret handling
-- The client submits the raw secret in a transient column `api_secret`.
-- A BEFORE INSERT/UPDATE trigger pushes it into Vault and stores only
-- the resulting secret_id reference. The raw value is wiped before the
-- row is persisted, so plain text never touches the public table.
-- =========================================================
alter table public.exchange_credentials
  add column if not exists api_secret text;

create or replace function public.exchange_credentials_vault_store()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_name text;
  v_new_id uuid;
begin
  -- Enforce ownership at the function layer too (defence in depth)
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'user_id mismatch';
  end if;

  -- Enforce read-only scope strictly
  if new.scope not in ('read_only','history','read-only','readonly') then
    raise exception 'scope % is not permitted; read-only scopes only', new.scope;
  end if;

  if new.api_secret is not null and length(new.api_secret) > 0 then
    v_secret_name := 'exch:' || new.user_id::text || ':' || new.provider || ':' || gen_random_uuid()::text;

    if tg_op = 'UPDATE' and old.secret_id is not null then
      -- Rotate: update existing vault secret in place
      perform vault.update_secret(old.secret_id, new.api_secret, v_secret_name, 'exchange credential');
      new.secret_id := old.secret_id;
    else
      v_new_id := vault.create_secret(new.api_secret, v_secret_name, 'exchange credential');
      new.secret_id := v_new_id;
    end if;
  elsif tg_op = 'INSERT' then
    raise exception 'api_secret is required on insert';
  else
    -- keep prior secret_id on update with no new secret
    new.secret_id := coalesce(new.secret_id, old.secret_id);
  end if;

  -- Wipe the transient plain-text column before persistence
  new.api_secret := null;
  return new;
end;
$$;

drop trigger if exists exchange_credentials_vault_store_trg on public.exchange_credentials;
create trigger exchange_credentials_vault_store_trg
  before insert or update on public.exchange_credentials
  for each row execute function public.exchange_credentials_vault_store();

-- On delete, purge the vault secret
create or replace function public.exchange_credentials_vault_purge()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if old.secret_id is not null then
    delete from vault.secrets where id = old.secret_id;
  end if;
  return old;
end;
$$;

drop trigger if exists exchange_credentials_vault_purge_trg on public.exchange_credentials;
create trigger exchange_credentials_vault_purge_trg
  after delete on public.exchange_credentials
  for each row execute function public.exchange_credentials_vault_purge();

-- Lock down direct access to the transient secret column at the API layer:
-- revoke select on the api_secret column (writes still allowed for the trigger to read NEW).
revoke select (api_secret) on public.exchange_credentials from anon, authenticated;