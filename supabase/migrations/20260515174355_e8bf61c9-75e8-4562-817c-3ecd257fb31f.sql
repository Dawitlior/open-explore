
-- Make avatars bucket private
update storage.buckets set public = false where id = 'avatars';

-- Drop any existing avatars policies (idempotent)
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'avatars_%' loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "avatars_select_own"
on storage.objects for select to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_insert_own"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_update_own"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_delete_own"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
