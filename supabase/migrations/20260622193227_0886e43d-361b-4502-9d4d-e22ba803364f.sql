
create table if not exists public.bug_resolution_feedback (
  bug_id     uuid not null references public.bug_reports(id) on delete cascade,
  user_id    uuid not null references auth.users(id)         on delete cascade,
  verdict    text not null check (verdict in ('fixed','not_fixed')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (bug_id, user_id)
);

grant select, insert, update, delete on public.bug_resolution_feedback to authenticated;
grant all on public.bug_resolution_feedback to service_role;

alter table public.bug_resolution_feedback enable row level security;
create index if not exists brf_bug_idx on public.bug_resolution_feedback(bug_id);

create or replace function public.brf_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists brf_touch on public.bug_resolution_feedback;
create trigger brf_touch before update on public.bug_resolution_feedback
  for each row execute function public.brf_touch_updated_at();

drop policy if exists brf_read on public.bug_resolution_feedback;
create policy brf_read on public.bug_resolution_feedback
  for select to authenticated
  using (public.has_role(auth.uid(),'admin') or user_id = auth.uid());

drop policy if exists brf_insert on public.bug_resolution_feedback;
create policy brf_insert on public.bug_resolution_feedback
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.bug_reporters r
                where r.bug_id = bug_resolution_feedback.bug_id and r.user_id = auth.uid())
    and exists (select 1 from public.bug_reports b
                where b.id = bug_resolution_feedback.bug_id and b.status = 'resolved')
  );

drop policy if exists brf_update on public.bug_resolution_feedback;
create policy brf_update on public.bug_resolution_feedback
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.bug_reports b
                where b.id = bug_resolution_feedback.bug_id and b.status = 'resolved')
  );

drop policy if exists brf_delete on public.bug_resolution_feedback;
create policy brf_delete on public.bug_resolution_feedback
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.bug_reports_clear_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status <> 'resolved' then
    delete from public.bug_resolution_feedback where bug_id = new.id;
  end if;
  return null;
end; $$;
drop trigger if exists bug_reports_clear_feedback_trg on public.bug_reports;
create trigger bug_reports_clear_feedback_trg
  after update on public.bug_reports
  for each row execute function public.bug_reports_clear_feedback();

do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='bug_resolution_feedback') then
    alter publication supabase_realtime add table public.bug_resolution_feedback;
  end if;
end $$;

insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'dawitlior777@gmail.com'
on conflict do nothing;
