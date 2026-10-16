-- Reemora Lounge — membership, approval history, follows.
--
-- Members are ordinary Supabase Auth users (same public.users row the rest
-- of the site uses). Lounge access is a separate row here, so approving or
-- suspending a member never touches public.users.role, course
-- registrations or payments. Everything in this file is additive.

-- ---------- lounge_members ----------
create table if not exists public.lounge_members (
  user_id uuid primary key references public.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  display_name text not null check (char_length(display_name) between 2 and 80),
  bio text check (bio is null or char_length(bio) <= 600),
  skills text[] not null default '{}',
  website_url text,
  -- {instagram, linkedin, x, youtube, github, other}: validated server-side
  social_links jsonb not null default '{}'::jsonb,
  avatar_url text,
  show_email boolean not null default false,
  show_phone boolean not null default false,
  -- Maintained by triggers only (see 0029 for the points ledger).
  points_total integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  chat_muted_until timestamptz,
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.users (id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lounge_members_status_idx on public.lounge_members (status);
create index if not exists lounge_members_applied_at_idx on public.lounge_members (applied_at desc);
create index if not exists lounge_members_points_idx on public.lounge_members (points_total desc);

drop trigger if exists lounge_members_set_updated_at on public.lounge_members;
create trigger lounge_members_set_updated_at
  before update on public.lounge_members
  for each row execute function public.set_updated_at();

-- Approved-member check used by every Lounge RLS policy, mirroring is_admin().
create or replace function public.is_lounge_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.lounge_members
    where user_id = auth.uid() and status = 'approved'
  );
$$;

grant execute on function public.is_lounge_member() to authenticated, anon;

-- Contact details are private by default. Other members may only see them
-- when the owner has opted in; the owner and admins always can.
create or replace function public.lounge_member_contact(p_user_id uuid)
returns table (email text, phone text)
language sql
security definer
set search_path = public
stable
as $$
  select
    case when m.show_email or p_user_id = auth.uid() or public.is_admin() then u.email else null end as email,
    case when m.show_phone or p_user_id = auth.uid() or public.is_admin() then u.phone else null end as phone
  from public.lounge_members m
  join public.users u on u.id = m.user_id
  where m.user_id = p_user_id
    and (m.status = 'approved' or p_user_id = auth.uid() or public.is_admin())
    and (public.is_lounge_member() or p_user_id = auth.uid() or public.is_admin());
$$;

grant execute on function public.lounge_member_contact(uuid) to authenticated;

alter table public.lounge_members enable row level security;

drop policy if exists "Members can view approved members" on public.lounge_members;
create policy "Members can view approved members" on public.lounge_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or (status = 'approved' and public.is_lounge_member()));

drop policy if exists "Members can update own profile" on public.lounge_members;
create policy "Members can update own profile" on public.lounge_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Rows are created and decided by server code (service role). Members may
-- only edit the profile columns below; status, points and counters are
-- unreachable from the browser regardless of what the UI sends.
revoke insert, update, delete on public.lounge_members from anon, authenticated;
grant update (display_name, bio, skills, website_url, social_links, avatar_url, show_email, show_phone, updated_at)
  on public.lounge_members to authenticated;

-- ---------- lounge_membership_events (approval history) ----------
create table if not exists public.lounge_membership_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  action text not null check (action in ('applied', 'approved', 'rejected', 'suspended', 'reactivated', 'note')),
  actor_id uuid references public.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists lounge_membership_events_user_idx on public.lounge_membership_events (user_id, created_at desc);

alter table public.lounge_membership_events enable row level security;

drop policy if exists "Admins and the member can view membership history" on public.lounge_membership_events;
create policy "Admins and the member can view membership history" on public.lounge_membership_events
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.lounge_membership_events from anon, authenticated;

-- ---------- lounge_follows ----------
create table if not exists public.lounge_follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  following_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint lounge_follows_not_self check (follower_id <> following_id)
);

create index if not exists lounge_follows_following_idx on public.lounge_follows (following_id);

create or replace function public.lounge_follows_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.lounge_members set following_count = following_count + 1 where user_id = new.follower_id;
    update public.lounge_members set followers_count = followers_count + 1 where user_id = new.following_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.lounge_members set following_count = greatest(0, following_count - 1) where user_id = old.follower_id;
    update public.lounge_members set followers_count = greatest(0, followers_count - 1) where user_id = old.following_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists lounge_follows_counters on public.lounge_follows;
create trigger lounge_follows_counters
  after insert or delete on public.lounge_follows
  for each row execute function public.lounge_follows_counters();

alter table public.lounge_follows enable row level security;

drop policy if exists "Members can view follows" on public.lounge_follows;
create policy "Members can view follows" on public.lounge_follows
  for select to authenticated using (public.is_lounge_member() or public.is_admin());

drop policy if exists "Members can follow approved members" on public.lounge_follows;
create policy "Members can follow approved members" on public.lounge_follows
  for insert to authenticated
  with check (
    follower_id = auth.uid()
    and public.is_lounge_member()
    and exists (select 1 from public.lounge_members t where t.user_id = following_id and t.status = 'approved')
  );

drop policy if exists "Members can unfollow" on public.lounge_follows;
create policy "Members can unfollow" on public.lounge_follows
  for delete to authenticated using (follower_id = auth.uid());

revoke update on public.lounge_follows from anon, authenticated;

-- ---------- push subscriptions for members ----------
-- 0017 only let admins register a device. Members may now manage their own
-- rows; sending is still server-side only.
drop policy if exists "Users can manage their own push subscriptions" on public.push_subscriptions;
create policy "Users can manage their own push subscriptions" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- storage: member uploads ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lounge-media', 'lounge-media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view lounge media" on storage.objects;
create policy "Public can view lounge media" on storage.objects
  for select using (bucket_id = 'lounge-media');

-- Each member writes only inside their own <user_id>/ folder.
drop policy if exists "Members can upload lounge media" on storage.objects;
create policy "Members can upload lounge media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lounge-media'
    and public.is_lounge_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Members can update own lounge media" on storage.objects;
create policy "Members can update own lounge media" on storage.objects
  for update to authenticated
  using (bucket_id = 'lounge-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'lounge-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Members can delete own lounge media" on storage.objects;
create policy "Members can delete own lounge media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lounge-media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- lounge_notifications (in-app notification center) ----------
-- Created here rather than with the feed because approval decisions are
-- the first thing that notifies a member. Rows are written by server code
-- only; dedupe_key makes re-processing the same event a no-op.
create table if not exists public.lounge_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  url text,
  actor_id uuid references public.users (id) on delete set null,
  dedupe_key text unique,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lounge_notifications_user_idx on public.lounge_notifications (user_id, is_read, created_at desc);

alter table public.lounge_notifications enable row level security;

drop policy if exists "Members can view own notifications" on public.lounge_notifications;
create policy "Members can view own notifications" on public.lounge_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Members can mark own notifications read" on public.lounge_notifications;
create policy "Members can mark own notifications read" on public.lounge_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke insert, update, delete on public.lounge_notifications from anon, authenticated;
grant update (is_read) on public.lounge_notifications to authenticated;

-- ---------- lounge_audit_log (admin actions) ----------
create table if not exists public.lounge_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lounge_audit_log_created_idx on public.lounge_audit_log (created_at desc);
create index if not exists lounge_audit_log_target_idx on public.lounge_audit_log (target_type, target_id);

alter table public.lounge_audit_log enable row level security;

drop policy if exists "Admins can view audit log" on public.lounge_audit_log;
create policy "Admins can view audit log" on public.lounge_audit_log
  for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.lounge_audit_log from anon, authenticated;
