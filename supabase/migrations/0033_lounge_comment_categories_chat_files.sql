-- 0033: structured comment categories on posts, file/image attachments in
-- the chat room, and a second bucket for non-image files. Additive only.

-- ---------- comments: category ----------
-- Feedback under a project is sorted into fixed buckets so an author can
-- read "what needs work" separately from "nice job". Null = plain comment.
alter table public.lounge_comments
  add column if not exists category text
    check (category is null or category in ('like', 'needs_work', 'suggestion', 'code', 'design', 'tip'));

create index if not exists lounge_comments_post_category_idx on public.lounge_comments (post_id, category);

-- ---------- chat: attachments ----------
alter table public.lounge_chat_messages
  add column if not exists attachment_url text check (attachment_url is null or char_length(attachment_url) <= 500),
  add column if not exists attachment_type text check (attachment_type is null or attachment_type in ('image', 'file')),
  add column if not exists attachment_name text check (attachment_name is null or char_length(attachment_name) <= 200),
  add column if not exists attachment_size integer check (attachment_size is null or attachment_size between 0 and 20971520);

-- A message may be an attachment alone; text is still capped at 1000.
alter table public.lounge_chat_messages drop constraint if exists lounge_chat_messages_body_check;
alter table public.lounge_chat_messages
  add constraint lounge_chat_messages_body_check
    check (char_length(body) <= 1000 and (char_length(body) >= 1 or attachment_url is not null));

-- ---------- storage: lounge-files (documents + images, 10 MB) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lounge-files', 'lounge-files', true, 10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'text/plain', 'text/markdown', 'text/csv', 'application/json',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view lounge files" on storage.objects;
create policy "Public can view lounge files" on storage.objects
  for select using (bucket_id = 'lounge-files');

drop policy if exists "Members can upload lounge files" on storage.objects;
create policy "Members can upload lounge files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lounge-files'
    and public.is_lounge_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members can delete own lounge files" on storage.objects;
create policy "Members can delete own lounge files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lounge-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Pictures are compressed in the browser before upload; 5 MB leaves room
-- for the rare phone photo that cannot be re-encoded client-side.
update storage.buckets set file_size_limit = 5242880 where id = 'lounge-media';
