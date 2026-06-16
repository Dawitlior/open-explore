create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin','moderator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

drop policy if exists roles_read_self_or_admin on public.user_roles;
create policy roles_read_self_or_admin on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table if not exists public.bug_reports (
  id               uuid primary key default gen_random_uuid(),
  title            text,
  description      text not null,
  section          text not null default 'general',
  route            text,
  bug_type         text not null default 'other'
                     check (bug_type in ('visual','crash','data','performance','other')),
  severity         text not null default 'medium'
                     check (severity in ('low','medium','high','critical')),
  status           text not null default 'open'
                     check (status in ('open','in_progress','resolved','wont_fix','duplicate')),
  element_selector text,
  element_label    text,
  element_rect     jsonb,
  viewport         jsonb,
  diagnostics      jsonb,
  dedup_key        text,
  created_by       uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.bug_reports enable row level security;
create index if not exists bug_reports_section_idx on public.bug_reports(section);
create index if not exists bug_reports_status_idx  on public.bug_reports(status);
create index if not exists bug_reports_dedup_idx    on public.bug_reports(dedup_key);
create index if not exists bug_reports_created_idx  on public.bug_reports(created_at desc);

create table if not exists public.bug_reporters (
  bug_id     uuid not null references public.bug_reports(id) on delete cascade,
  user_id    uuid not null references auth.users(id)         on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  primary key (bug_id, user_id)
);
alter table public.bug_reporters enable row level security;
create index if not exists bug_reporters_user_idx on public.bug_reporters(user_id);
create index if not exists bug_reporters_bug_idx  on public.bug_reporters(bug_id);

create table if not exists public.bug_attachments (
  id           uuid primary key default gen_random_uuid(),
  bug_id       uuid not null references public.bug_reports(id) on delete cascade,
  user_id      uuid not null references auth.users(id)         on delete cascade,
  storage_path text not null,
  kind         text not null default 'illustration'
                 check (kind in ('screenshot','annotation','illustration')),
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);
alter table public.bug_attachments enable row level security;
create index if not exists bug_attachments_bug_idx on public.bug_attachments(bug_id);

create table if not exists public.bug_comments (
  id         uuid primary key default gen_random_uuid(),
  bug_id     uuid not null references public.bug_reports(id) on delete cascade,
  user_id    uuid not null references auth.users(id)         on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
alter table public.bug_comments enable row level security;
create index if not exists bug_comments_bug_idx on public.bug_comments(bug_id, created_at);

create or replace function public.reporter_count(_bug_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.bug_reporters where bug_id = _bug_id;
$$;

create or replace function public.is_sole_reporter(_bug_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from public.bug_reporters where bug_id = _bug_id) = 1
     and exists (select 1 from public.bug_reporters where bug_id = _bug_id and user_id = _user_id);
$$;

create or replace function public.bug_reports_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status is distinct from old.status) and not public.has_role(auth.uid(),'admin') then
    raise exception 'Only admins can change bug status';
  end if;
  if not public.has_role(auth.uid(),'admin') then
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists bug_reports_before_update_trg on public.bug_reports;
create trigger bug_reports_before_update_trg
  before update on public.bug_reports
  for each row execute function public.bug_reports_before_update();

grant select, insert, update, delete on public.bug_reports     to authenticated;
grant select, insert, update, delete on public.bug_reporters    to authenticated;
grant select, insert, update, delete on public.bug_attachments  to authenticated;
grant select, insert, update, delete on public.bug_comments     to authenticated;
grant select                          on public.user_roles      to authenticated;
grant all on public.bug_reports, public.bug_reporters, public.bug_attachments,
            public.bug_comments, public.user_roles to service_role;

drop policy if exists bugs_read_all              on public.bug_reports;
drop policy if exists bugs_insert_self           on public.bug_reports;
drop policy if exists bugs_update_owner_or_admin on public.bug_reports;
drop policy if exists bugs_delete_sole_or_admin  on public.bug_reports;

create policy bugs_read_all on public.bug_reports for select to authenticated using (true);
create policy bugs_insert_self on public.bug_reports for insert to authenticated with check (created_by = auth.uid());
create policy bugs_update_owner_or_admin on public.bug_reports for update to authenticated
  using  (created_by = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (created_by = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy bugs_delete_sole_or_admin on public.bug_reports for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.is_sole_reporter(id, auth.uid()));

drop policy if exists reporters_read_all     on public.bug_reporters;
drop policy if exists reporters_join_self    on public.bug_reporters;
drop policy if exists reporters_update_self  on public.bug_reporters;
drop policy if exists reporters_leave_self   on public.bug_reporters;

create policy reporters_read_all on public.bug_reporters for select to authenticated using (true);
create policy reporters_join_self on public.bug_reporters for insert to authenticated with check (user_id = auth.uid());
create policy reporters_update_self on public.bug_reporters for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reporters_leave_self on public.bug_reporters for delete to authenticated
  using (user_id = auth.uid()
         and (select count(*) from public.bug_reporters r where r.bug_id = bug_reporters.bug_id) > 1);

drop policy if exists att_read_all            on public.bug_attachments;
drop policy if exists att_insert_if_reporter  on public.bug_attachments;
drop policy if exists att_delete_own_or_admin on public.bug_attachments;

create policy att_read_all on public.bug_attachments for select to authenticated using (true);
create policy att_insert_if_reporter on public.bug_attachments for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.bug_reporters r
                          where r.bug_id = bug_attachments.bug_id and r.user_id = auth.uid()));
create policy att_delete_own_or_admin on public.bug_attachments for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists cmt_read_all            on public.bug_comments;
drop policy if exists cmt_insert_self         on public.bug_comments;
drop policy if exists cmt_modify_own_or_admin on public.bug_comments;
drop policy if exists cmt_delete_own_or_admin on public.bug_comments;

create policy cmt_read_all on public.bug_comments for select to authenticated using (true);
create policy cmt_insert_self on public.bug_comments for insert to authenticated with check (user_id = auth.uid());
create policy cmt_modify_own_or_admin on public.bug_comments for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy cmt_delete_own_or_admin on public.bug_comments for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.create_bug_report(
  p_description      text,
  p_section          text default 'general',
  p_route            text default null,
  p_bug_type         text default 'other',
  p_severity         text default 'medium',
  p_title            text default null,
  p_element_selector text default null,
  p_element_label    text default null,
  p_element_rect     jsonb default null,
  p_viewport         jsonb default null,
  p_diagnostics      jsonb default null
) returns public.bug_reports
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bug public.bug_reports;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  insert into public.bug_reports(
    title, description, section, route, bug_type, severity,
    element_selector, element_label, element_rect, viewport, diagnostics,
    dedup_key, created_by
  ) values (
    p_title, p_description,
    coalesce(nullif(p_section,''), 'general'),
    p_route, coalesce(p_bug_type,'other'), coalesce(p_severity,'medium'),
    p_element_selector, p_element_label, p_element_rect, p_viewport, p_diagnostics,
    coalesce(p_route,'') || '::' || coalesce(p_element_selector,''),
    v_uid
  ) returning * into v_bug;
  insert into public.bug_reporters(bug_id, user_id) values (v_bug.id, v_uid)
    on conflict (bug_id, user_id) do nothing;
  return v_bug;
end; $$;

create or replace function public.join_bug(p_bug_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.bug_reporters(bug_id, user_id, note)
  values (p_bug_id, auth.uid(), p_note)
  on conflict (bug_id, user_id) do update set note = excluded.note;
end; $$;

create or replace function public.set_bug_status(p_bug_id uuid, p_status text)
returns public.bug_reports
language plpgsql security definer set search_path = public as $$
declare v_bug public.bug_reports;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'Only admins can change status';
  end if;
  update public.bug_reports set status = p_status where id = p_bug_id returning * into v_bug;
  return v_bug;
end; $$;

revoke all on function public.create_bug_report(text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb) from public;
grant execute on function public.create_bug_report(text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb) to authenticated;
revoke all on function public.join_bug(uuid,text) from public;
grant execute on function public.join_bug(uuid,text) to authenticated;
revoke all on function public.set_bug_status(uuid,text) from public;
grant execute on function public.set_bug_status(uuid,text) to authenticated;
grant execute on function public.has_role(uuid,text) to authenticated;
grant execute on function public.reporter_count(uuid) to authenticated;
grant execute on function public.is_sole_reporter(uuid,uuid) to authenticated;

-- Storage policies (bucket already created)
drop policy if exists bug_att_read   on storage.objects;
drop policy if exists bug_att_insert on storage.objects;
drop policy if exists bug_att_delete on storage.objects;

create policy bug_att_read on storage.objects for select to authenticated
  using (bucket_id = 'bug-attachments');
create policy bug_att_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'bug-attachments' and owner = auth.uid());
create policy bug_att_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bug-attachments' and owner = auth.uid());

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='bug_reports') then
    alter publication supabase_realtime add table public.bug_reports;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='bug_reporters') then
    alter publication supabase_realtime add table public.bug_reporters;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='bug_attachments') then
    alter publication supabase_realtime add table public.bug_attachments;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='bug_comments') then
    alter publication supabase_realtime add table public.bug_comments;
  end if;
end $$;

create or replace function public.bug_arena_people(_ids uuid[])
returns table (id uuid, display_name text, avatar_url text)
language sql stable security definer set search_path = public, auth as $$
  select
    u.id,
    coalesce(
      p.display_name,
      nullif(u.raw_user_meta_data->>'name', ''),
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(u.raw_user_meta_data->>'display_name', ''),
      'משתמש'
    ) as display_name,
    coalesce(
      p.avatar_url,
      nullif(u.raw_user_meta_data->>'avatar_url', ''),
      nullif(u.raw_user_meta_data->>'picture', '')
    ) as avatar_url
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = any(_ids);
$$;
grant execute on function public.bug_arena_people(uuid[]) to authenticated;