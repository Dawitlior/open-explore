
-- ============================================================
-- PHASE 0 — SaaS Entitlement Foundation
-- ============================================================

-- 1. ENUMS ----------------------------------------------------
do $$ begin
  create type public.app_tier as enum ('standard', 'advanced', 'ultimate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sub_status as enum ('trialing', 'active', 'past_due', 'canceled', 'expired');
exception when duplicate_object then null; end $$;

-- 2. SUBSCRIPTIONS TABLE -------------------------------------
create table if not exists public.subscriptions (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  tier                     public.app_tier  not null default 'standard',
  status                   public.sub_status not null default 'trialing',
  trial_started_at         timestamptz      not null default now(),
  trial_ends_at            timestamptz      not null default (now() + interval '7 days'),
  current_period_end       timestamptz,
  provider                 text,            -- 'stripe' | null (iCount is internal-only)
  provider_customer_id     text,
  provider_subscription_id text,
  grandfathered            boolean          not null default false,
  cancel_at_period_end     boolean          not null default false,
  updated_at               timestamptz      not null default now(),
  created_at               timestamptz      not null default now()
);

alter table public.subscriptions enable row level security;

-- Users can read ONLY their own row. No insert/update/delete from clients.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

create index if not exists subscriptions_status_idx on public.subscriptions(status);
create index if not exists subscriptions_trial_ends_idx on public.subscriptions(trial_ends_at);

create trigger trg_subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- 3. BILLING EVENTS (idempotent webhook log) -----------------
create table if not exists public.billing_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,            -- 'stripe' | 'icount'
  event_id     text not null,            -- provider's event id
  event_type   text not null,
  user_id      uuid references auth.users(id) on delete set null,
  payload      jsonb not null,
  invoice_url  text,                     -- iCount tax invoice PDF (חשבונית מס)
  processed_at timestamptz,
  received_at  timestamptz not null default now(),
  unique (provider, event_id)
);

alter table public.billing_events enable row level security;

drop policy if exists billing_events_select_own on public.billing_events;
create policy billing_events_select_own on public.billing_events
  for select to authenticated using (auth.uid() = user_id);

create index if not exists billing_events_user_idx on public.billing_events(user_id, received_at desc);

-- 4. FEATURE FLAGS -------------------------------------------
create table if not exists public.feature_flags (
  user_id    uuid not null references auth.users(id) on delete cascade,
  flag       text not null,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, flag)
);

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_select_own on public.feature_flags;
create policy feature_flags_select_own on public.feature_flags
  for select to authenticated using (auth.uid() = user_id);

-- 5. ENTITLEMENT RPC -----------------------------------------
-- Returns the *effective* tier for a user right now, honoring trial expiry
-- and a 3-day past-due grace window (per approved plan).
create or replace function public.current_entitlement(p_user uuid)
returns public.app_tier
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.subscriptions;
begin
  select * into s from public.subscriptions where user_id = p_user;
  if not found then
    return 'standard'::public.app_tier;
  end if;

  -- Active paid subscribers get their full tier
  if s.status = 'active' then
    return s.tier;
  end if;

  -- Trial users get Advanced for the duration of the trial
  if s.status = 'trialing' and s.trial_ends_at > now() then
    return 'advanced'::public.app_tier;
  end if;

  -- 3-day dunning grace for past-due before downgrade
  if s.status = 'past_due'
     and s.current_period_end is not null
     and s.current_period_end + interval '3 days' > now() then
    return s.tier;
  end if;

  -- Grandfathered users keep their tier regardless of status
  if s.grandfathered then
    return s.tier;
  end if;

  return 'standard'::public.app_tier;
end;
$$;

grant execute on function public.current_entitlement(uuid) to authenticated;

-- 6. NEW-USER TRIGGER ----------------------------------------
-- Every new signup gets a row with a fresh 7-day Advanced trial.
create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, tier, status, trial_started_at, trial_ends_at)
  values (new.id, 'standard', 'trialing', now(), now() + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_subscription();

-- 7. GRANDFATHER EXISTING USERS ------------------------------
-- Every user that already exists today gets lifetime Advanced.
insert into public.subscriptions (user_id, tier, status, grandfathered, trial_started_at, trial_ends_at)
select u.id, 'advanced'::public.app_tier, 'active'::public.sub_status, true, now(), now()
from auth.users u
on conflict (user_id) do update
  set tier = 'advanced'::public.app_tier,
      status = 'active'::public.sub_status,
      grandfathered = true,
      updated_at = now();
