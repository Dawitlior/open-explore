-- Avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Avatars are publicly readable') then
    create policy "Avatars are publicly readable"
      on storage.objects for select
      using (bucket_id = 'avatars');
  end if;
end $$;

-- Owner-only write
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users upload own avatar') then
    create policy "Users upload own avatar"
      on storage.objects for insert
      with check (bucket_id='avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users update own avatar') then
    create policy "Users update own avatar"
      on storage.objects for update
      using (bucket_id='avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Users delete own avatar') then
    create policy "Users delete own avatar"
      on storage.objects for delete
      using (bucket_id='avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

-- Ensure profiles.avatar_url
alter table public.profiles add column if not exists avatar_url text;