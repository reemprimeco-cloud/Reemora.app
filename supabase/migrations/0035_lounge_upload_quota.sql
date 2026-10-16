-- 0035: per-member upload quota, enforced where it cannot be bypassed.
-- A member may add at most 80 objects per rolling 24 hours across both
-- Lounge buckets (a busy day of avatars, screenshots and chat files is
-- well under that). The app's own limits are convenience; this is the
-- ceiling that protects storage cost and the community from one account.

create or replace function public.lounge_upload_quota_ok()
returns boolean
language sql
security definer
set search_path = public, storage
stable
as $$
  select (
    select count(*)
    from storage.objects o
    where o.bucket_id in ('lounge-media', 'lounge-files')
      and (storage.foldername(o.name))[1] = auth.uid()::text
      and o.created_at > now() - interval '24 hours'
  ) < 80;
$$;

revoke execute on function public.lounge_upload_quota_ok() from public, anon;
grant execute on function public.lounge_upload_quota_ok() to authenticated;

drop policy if exists "Members can upload lounge media" on storage.objects;
create policy "Members can upload lounge media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lounge-media'
    and public.is_lounge_member()
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.lounge_upload_quota_ok()
  );

drop policy if exists "Members can upload lounge files" on storage.objects;
create policy "Members can upload lounge files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lounge-files'
    and public.is_lounge_member()
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.lounge_upload_quota_ok()
  );
