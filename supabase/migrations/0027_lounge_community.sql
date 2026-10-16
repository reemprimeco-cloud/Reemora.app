-- Reemora Lounge — community feed, comments, likes, bookmarks, the single
-- public chat room, and content reports.
--
-- Authors reference lounge_members (not users) so PostgREST can embed the
-- author's display name/avatar in one query, and so content disappears
-- with the membership row. There is deliberately NO private-message table.

-- ---------- lounge_posts ----------
create table if not exists public.lounge_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.lounge_members (user_id) on delete cascade,
  type text not null check (type in ('discussion', 'question', 'project', 'milestone', 'tool')),
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 3 and 5000),
  project_url text check (project_url is null or project_url ~* '^https?://'),
  project_category text,
  project_status text check (project_status is null or project_status in ('prototype', 'in_progress', 'completed')),
  tools text[] not null default '{}',
  image_url text,
  gallery_urls text[] not null default '{}',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  is_hidden boolean not null default false,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lounge_posts_project_needs_url check (type <> 'project' or project_url is not null),
  constraint lounge_posts_gallery_limit check (cardinality(gallery_urls) <= 6)
);

create index if not exists lounge_posts_created_idx on public.lounge_posts (created_at desc);
create index if not exists lounge_posts_author_idx on public.lounge_posts (author_id, created_at desc);
create index if not exists lounge_posts_type_idx on public.lounge_posts (type, created_at desc);
create index if not exists lounge_posts_popular_idx on public.lounge_posts (like_count desc, created_at desc);

drop trigger if exists lounge_posts_set_updated_at on public.lounge_posts;
create trigger lounge_posts_set_updated_at
  before update on public.lounge_posts
  for each row execute function public.set_updated_at();

-- ---------- lounge_comments ----------
create table if not exists public.lounge_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.lounge_posts (id) on delete cascade,
  author_id uuid not null references public.lounge_members (user_id) on delete cascade,
  parent_id uuid references public.lounge_comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_helpful boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lounge_comments_post_idx on public.lounge_comments (post_id, created_at);
create index if not exists lounge_comments_author_idx on public.lounge_comments (author_id);

drop trigger if exists lounge_comments_set_updated_at on public.lounge_comments;
create trigger lounge_comments_set_updated_at
  before update on public.lounge_comments
  for each row execute function public.set_updated_at();

-- ---------- lounge_post_likes ----------
create table if not exists public.lounge_post_likes (
  post_id uuid not null references public.lounge_posts (id) on delete cascade,
  user_id uuid not null references public.lounge_members (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists lounge_post_likes_user_idx on public.lounge_post_likes (user_id);

-- ---------- lounge_bookmarks ----------
create table if not exists public.lounge_bookmarks (
  user_id uuid not null references public.lounge_members (user_id) on delete cascade,
  post_id uuid not null references public.lounge_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ---------- lounge_chat_messages (the one public room) ----------
create table if not exists public.lounge_chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.lounge_members (user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  reply_to_id uuid references public.lounge_chat_messages (id) on delete set null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lounge_chat_messages_created_idx on public.lounge_chat_messages (created_at desc);
create index if not exists lounge_chat_messages_author_idx on public.lounge_chat_messages (author_id, created_at desc);

-- ---------- lounge_reports ----------
create table if not exists public.lounge_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.lounge_members (user_id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'chat_message', 'member')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.users (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index if not exists lounge_reports_status_idx on public.lounge_reports (status, created_at desc);

-- ---------- counters ----------
create or replace function public.lounge_post_like_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.lounge_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  else
    update public.lounge_posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
    return old;
  end if;
end;
$$;

drop trigger if exists lounge_post_like_counter on public.lounge_post_likes;
create trigger lounge_post_like_counter
  after insert or delete on public.lounge_post_likes
  for each row execute function public.lounge_post_like_counter();

create or replace function public.lounge_post_comment_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post uuid := coalesce(new.post_id, old.post_id);
begin
  update public.lounge_posts
  set comment_count = (select count(*) from public.lounge_comments c where c.post_id = v_post and not c.is_hidden)
  where id = v_post;
  return coalesce(new, old);
end;
$$;

drop trigger if exists lounge_post_comment_counter on public.lounge_comments;
create trigger lounge_post_comment_counter
  after insert or delete or update of is_hidden on public.lounge_comments
  for each row execute function public.lounge_post_comment_counter();

-- ---------- anti-spam rate limits (enforced in the database) ----------
create or replace function public.lounge_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := tg_argv[0]::integer;
  v_window interval := tg_argv[1]::interval;
  v_count integer;
begin
  execute format('select count(*) from %I.%I where author_id = $1 and created_at > now() - $2', tg_table_schema, tg_table_name)
    into v_count using new.author_id, v_window;
  if v_count >= v_limit then
    raise exception 'rate_limited' using errcode = 'P0001', hint = format('max %s per %s', v_limit, v_window);
  end if;
  return new;
end;
$$;

drop trigger if exists lounge_chat_messages_rate_limit on public.lounge_chat_messages;
create trigger lounge_chat_messages_rate_limit
  before insert on public.lounge_chat_messages
  for each row execute function public.lounge_rate_limit('5', '10 seconds');

drop trigger if exists lounge_posts_rate_limit on public.lounge_posts;
create trigger lounge_posts_rate_limit
  before insert on public.lounge_posts
  for each row execute function public.lounge_rate_limit('10', '1 hour');

drop trigger if exists lounge_comments_rate_limit on public.lounge_comments;
create trigger lounge_comments_rate_limit
  before insert on public.lounge_comments
  for each row execute function public.lounge_rate_limit('30', '10 minutes');

-- A muted member can't post in chat even if the UI is bypassed.
create or replace function public.lounge_chat_mute_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.lounge_members m where m.user_id = new.author_id and m.chat_muted_until is not null and m.chat_muted_until > now()) then
    raise exception 'chat_muted' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists lounge_chat_messages_mute_check on public.lounge_chat_messages;
create trigger lounge_chat_messages_mute_check
  before insert on public.lounge_chat_messages
  for each row execute function public.lounge_chat_mute_check();

-- ---------- RLS ----------
alter table public.lounge_posts enable row level security;
alter table public.lounge_comments enable row level security;
alter table public.lounge_post_likes enable row level security;
alter table public.lounge_bookmarks enable row level security;
alter table public.lounge_chat_messages enable row level security;
alter table public.lounge_reports enable row level security;

-- posts
drop policy if exists "Members can view posts" on public.lounge_posts;
create policy "Members can view posts" on public.lounge_posts
  for select to authenticated
  using (public.is_admin() or (public.is_lounge_member() and (not is_hidden or author_id = auth.uid())));

drop policy if exists "Members can create posts" on public.lounge_posts;
create policy "Members can create posts" on public.lounge_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_lounge_member());

drop policy if exists "Authors can edit own posts" on public.lounge_posts;
create policy "Authors can edit own posts" on public.lounge_posts
  for update to authenticated
  using (author_id = auth.uid() and public.is_lounge_member())
  with check (author_id = auth.uid());

drop policy if exists "Authors and admins can delete posts" on public.lounge_posts;
create policy "Authors and admins can delete posts" on public.lounge_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

revoke update on public.lounge_posts from anon, authenticated;
grant update (title, body, project_url, project_category, project_status, tools, image_url, gallery_urls, updated_at)
  on public.lounge_posts to authenticated;

-- comments
drop policy if exists "Members can view comments" on public.lounge_comments;
create policy "Members can view comments" on public.lounge_comments
  for select to authenticated
  using (public.is_admin() or (public.is_lounge_member() and (not is_hidden or author_id = auth.uid())));

drop policy if exists "Members can comment" on public.lounge_comments;
create policy "Members can comment" on public.lounge_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_lounge_member()
    and exists (select 1 from public.lounge_posts p where p.id = post_id and not p.is_hidden)
  );

drop policy if exists "Authors can edit own comments" on public.lounge_comments;
create policy "Authors can edit own comments" on public.lounge_comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "Authors and admins can delete comments" on public.lounge_comments;
create policy "Authors and admins can delete comments" on public.lounge_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

revoke update on public.lounge_comments from anon, authenticated;
grant update (body, updated_at) on public.lounge_comments to authenticated;

-- likes
drop policy if exists "Members can view likes" on public.lounge_post_likes;
create policy "Members can view likes" on public.lounge_post_likes
  for select to authenticated using (public.is_lounge_member() or public.is_admin());

drop policy if exists "Members can like" on public.lounge_post_likes;
create policy "Members can like" on public.lounge_post_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_lounge_member()
    and exists (select 1 from public.lounge_posts p where p.id = post_id and not p.is_hidden)
  );

drop policy if exists "Members can unlike" on public.lounge_post_likes;
create policy "Members can unlike" on public.lounge_post_likes
  for delete to authenticated using (user_id = auth.uid());

revoke update on public.lounge_post_likes from anon, authenticated;

-- bookmarks (private to the member)
drop policy if exists "Members manage own bookmarks" on public.lounge_bookmarks;
create policy "Members manage own bookmarks" on public.lounge_bookmarks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_lounge_member());

revoke update on public.lounge_bookmarks from anon, authenticated;

-- chat
drop policy if exists "Members can read chat" on public.lounge_chat_messages;
create policy "Members can read chat" on public.lounge_chat_messages
  for select to authenticated
  using (public.is_admin() or (public.is_lounge_member() and not is_hidden));

drop policy if exists "Members can send chat messages" on public.lounge_chat_messages;
create policy "Members can send chat messages" on public.lounge_chat_messages
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_lounge_member());

-- No member update/delete: moderation (hide/remove) is admin-only via the
-- service role so the audit log always records it.
revoke update, delete on public.lounge_chat_messages from anon, authenticated;

-- reports
drop policy if exists "Members can file reports" on public.lounge_reports;
create policy "Members can file reports" on public.lounge_reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_lounge_member());

drop policy if exists "Reporters and admins can view reports" on public.lounge_reports;
create policy "Reporters and admins can view reports" on public.lounge_reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin());

revoke update, delete on public.lounge_reports from anon, authenticated;

-- ---------- Realtime for the chat room ----------
-- Postgres Changes honours RLS per subscriber, so only approved members
-- receive inserts.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lounge_chat_messages'
  ) then
    alter publication supabase_realtime add table public.lounge_chat_messages;
  end if;
end $$;
