-- 0034: Lounge uploads are members-only. Both buckets become private and
-- the "anyone with the link" read policies are replaced with a policy for
-- the file's owner, approved members and admins. The app streams files
-- through /api/lounge/media (service role) after its own session check, so
-- a storage URL on its own no longer opens anything.

update storage.buckets set public = false where id in ('lounge-media', 'lounge-files');

drop policy if exists "Public can view lounge media" on storage.objects;
drop policy if exists "Public can view lounge files" on storage.objects;

drop policy if exists "Members can view lounge uploads" on storage.objects;
create policy "Members can view lounge uploads" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('lounge-media', 'lounge-files')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_lounge_member()
      or public.is_admin()
    )
  );
