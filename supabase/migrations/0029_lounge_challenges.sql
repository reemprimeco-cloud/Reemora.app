-- Reemora Lounge — Lounge Challenges: competitions, entries, votes, awards.
--
--   • One vote per member per challenge (primary key), never for your own
--     entry, only while voting is open — all checked inside
--     lounge_cast_vote(), the only write path to lounge_challenge_votes.
--   • Vote counts are trigger-maintained from the votes table.
--   • lounge_finalize_challenge() ranks valid votes (approved entries,
--     approved voters), breaks ties by earliest entry, and awards badges +
--     points with ON CONFLICT guards so re-running never duplicates.
--   • Awards live in their own table: a badge only ever comes from a
--     finalized result or an admin award, never from points.

-- ---------- lounge_challenges ----------
create table if not exists public.lounge_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text not null,
  rules text,
  categories text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'open', 'paused', 'voting', 'closed', 'finalized', 'cancelled')),
  submissions_open_at timestamptz,
  submissions_close_at timestamptz,
  voting_open_at timestamptz,
  voting_close_at timestamptz,
  max_entries integer check (max_entries is null or max_entries >= 1),
  allow_vote_change boolean not null default false,
  tie_rule text not null default 'earliest_entry',
  created_by uuid references public.users (id) on delete set null,
  finalized_at timestamptz,
  finalized_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lounge_challenges_status_idx on public.lounge_challenges (status, created_at desc);

drop trigger if exists lounge_challenges_set_updated_at on public.lounge_challenges;
create trigger lounge_challenges_set_updated_at
  before update on public.lounge_challenges
  for each row execute function public.set_updated_at();

-- ---------- lounge_challenge_entries ----------
create table if not exists public.lounge_challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.lounge_challenges (id) on delete cascade,
  member_id uuid not null references public.lounge_members (user_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 10 and 3000),
  project_url text not null check (project_url ~* '^https?://'),
  image_url text,
  gallery_urls text[] not null default '{}',
  tools text[] not null default '{}',
  category text,
  status text not null default 'approved' check (status in ('submitted', 'approved', 'rejected', 'withdrawn')),
  vote_count integer not null default 0,
  final_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, member_id)
);

create index if not exists lounge_challenge_entries_challenge_idx on public.lounge_challenge_entries (challenge_id, vote_count desc, created_at);
create index if not exists lounge_challenge_entries_member_idx on public.lounge_challenge_entries (member_id);

drop trigger if exists lounge_challenge_entries_set_updated_at on public.lounge_challenge_entries;
create trigger lounge_challenge_entries_set_updated_at
  before update on public.lounge_challenge_entries
  for each row execute function public.set_updated_at();

-- Entry window + entry limit are checked in the database, not only the UI.
create or replace function public.lounge_entry_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ch public.lounge_challenges%rowtype;
  v_count integer;
begin
  select * into v_ch from public.lounge_challenges where id = new.challenge_id for update;
  if not found then
    raise exception 'challenge_not_found';
  end if;
  if v_ch.status <> 'open' then
    raise exception 'entries_closed';
  end if;
  if v_ch.submissions_open_at is not null and now() < v_ch.submissions_open_at then
    raise exception 'entries_not_open_yet';
  end if;
  if v_ch.submissions_close_at is not null and now() > v_ch.submissions_close_at then
    raise exception 'entries_closed';
  end if;
  if v_ch.max_entries is not null then
    select count(*) into v_count from public.lounge_challenge_entries
    where challenge_id = new.challenge_id and status in ('submitted', 'approved');
    if v_count >= v_ch.max_entries then
      raise exception 'entry_limit_reached';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lounge_entry_guard on public.lounge_challenge_entries;
create trigger lounge_entry_guard
  before insert on public.lounge_challenge_entries
  for each row execute function public.lounge_entry_guard();

-- ---------- lounge_challenge_votes ----------
create table if not exists public.lounge_challenge_votes (
  challenge_id uuid not null references public.lounge_challenges (id) on delete cascade,
  voter_id uuid not null references public.lounge_members (user_id) on delete cascade,
  entry_id uuid not null references public.lounge_challenge_entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (challenge_id, voter_id)
);

create index if not exists lounge_challenge_votes_entry_idx on public.lounge_challenge_votes (entry_id);

create or replace function public.lounge_vote_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.lounge_challenge_entries set vote_count = vote_count + 1 where id = new.entry_id;
  elsif tg_op = 'UPDATE' and new.entry_id <> old.entry_id then
    update public.lounge_challenge_entries set vote_count = greatest(0, vote_count - 1) where id = old.entry_id;
    update public.lounge_challenge_entries set vote_count = vote_count + 1 where id = new.entry_id;
  elsif tg_op = 'DELETE' then
    update public.lounge_challenge_entries set vote_count = greatest(0, vote_count - 1) where id = old.entry_id;
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists lounge_vote_counter on public.lounge_challenge_votes;
create trigger lounge_vote_counter
  after insert or update or delete on public.lounge_challenge_votes
  for each row execute function public.lounge_vote_counter();

-- ---------- lounge_challenge_awards (permanent badges) ----------
create table if not exists public.lounge_challenge_awards (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.lounge_challenges (id) on delete cascade,
  entry_id uuid not null references public.lounge_challenge_entries (id) on delete cascade,
  member_id uuid not null references public.lounge_members (user_id) on delete cascade,
  place integer not null check (place >= 1),
  badge_code text not null check (badge_code in ('champion', 'runner_up', 'third', 'winner')),
  points_awarded integer not null default 0,
  awarded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (challenge_id, member_id),
  unique (challenge_id, place)
);

create index if not exists lounge_challenge_awards_member_idx on public.lounge_challenge_awards (member_id);

-- ---------- lounge_cast_vote(): the only way to vote ----------
create or replace function public.lounge_cast_vote(p_entry_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_entry public.lounge_challenge_entries%rowtype;
  v_ch public.lounge_challenges%rowtype;
  v_existing public.lounge_challenge_votes%rowtype;
begin
  if v_uid is null or not public.is_lounge_member() then
    raise exception 'not_a_member';
  end if;

  select * into v_entry from public.lounge_challenge_entries where id = p_entry_id;
  if not found or v_entry.status <> 'approved' then
    raise exception 'entry_not_found';
  end if;
  if v_entry.member_id = v_uid then
    raise exception 'own_entry';
  end if;

  select * into v_ch from public.lounge_challenges where id = v_entry.challenge_id for share;
  if v_ch.status <> 'voting' then
    raise exception 'voting_closed';
  end if;
  if v_ch.voting_open_at is not null and now() < v_ch.voting_open_at then
    raise exception 'voting_not_open_yet';
  end if;
  if v_ch.voting_close_at is not null and now() > v_ch.voting_close_at then
    raise exception 'voting_closed';
  end if;

  -- Serialise concurrent votes by the same member on this challenge.
  perform pg_advisory_xact_lock(hashtext(v_ch.id::text || ':' || v_uid::text));

  select * into v_existing from public.lounge_challenge_votes where challenge_id = v_ch.id and voter_id = v_uid;
  if found then
    if v_existing.entry_id = p_entry_id then
      return json_build_object('ok', true, 'entry_id', p_entry_id, 'changed', false);
    end if;
    if not v_ch.allow_vote_change then
      raise exception 'already_voted';
    end if;
    update public.lounge_challenge_votes set entry_id = p_entry_id, updated_at = now()
    where challenge_id = v_ch.id and voter_id = v_uid;
    return json_build_object('ok', true, 'entry_id', p_entry_id, 'changed', true);
  end if;

  insert into public.lounge_challenge_votes (challenge_id, voter_id, entry_id)
  values (v_ch.id, v_uid, p_entry_id)
  on conflict (challenge_id, voter_id) do nothing;

  return json_build_object('ok', true, 'entry_id', p_entry_id, 'changed', false);
end;
$$;

grant execute on function public.lounge_cast_vote(uuid) to authenticated;

-- ---------- lounge_finalize_challenge(): idempotent results + awards ----------
create or replace function public.lounge_finalize_challenge(p_challenge_id uuid, p_actor_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ch public.lounge_challenges%rowtype;
  v_row record;
  v_place integer := 0;
  v_badge text;
  v_rule text;
  v_points integer;
  v_award_id uuid;
  v_winners jsonb := '[]'::jsonb;
  v_is_service boolean := coalesce(current_setting('request.jwt.claims', true), '')::text like '%"role":"service_role"%';
begin
  if not (v_is_service or public.is_admin()) then
    raise exception 'admin_only';
  end if;

  select * into v_ch from public.lounge_challenges where id = p_challenge_id for update;
  if not found then
    raise exception 'challenge_not_found';
  end if;
  if v_ch.status not in ('voting', 'closed', 'finalized') then
    raise exception 'not_ready_to_finalize';
  end if;

  -- Only votes from members who are still approved count; recompute from
  -- the source of truth rather than trusting the running counter.
  update public.lounge_challenge_entries e
  set vote_count = (
    select count(*) from public.lounge_challenge_votes v
    join public.lounge_members m on m.user_id = v.voter_id and m.status = 'approved'
    where v.entry_id = e.id
  )
  where e.challenge_id = p_challenge_id;

  update public.lounge_challenge_entries e
  set final_rank = r.rnk
  from (
    select id, row_number() over (order by vote_count desc, created_at asc) as rnk
    from public.lounge_challenge_entries
    where challenge_id = p_challenge_id and status = 'approved'
  ) r
  where e.id = r.id;

  update public.lounge_challenge_entries set final_rank = null
  where challenge_id = p_challenge_id and status <> 'approved';

  for v_row in
    select e.id, e.member_id, e.title, e.final_rank, e.vote_count
    from public.lounge_challenge_entries e
    where e.challenge_id = p_challenge_id and e.status = 'approved' and e.final_rank between 1 and 3
    order by e.final_rank
  loop
    v_place := v_row.final_rank;
    v_badge := case v_place when 1 then 'champion' when 2 then 'runner_up' else 'third' end;
    v_rule := 'challenge_place_' || v_place;
    select points into v_points from public.lounge_points_rules where key = v_rule and is_active;
    v_points := coalesce(v_points, 0);

    insert into public.lounge_challenge_awards (challenge_id, entry_id, member_id, place, badge_code, points_awarded, awarded_by)
    values (p_challenge_id, v_row.id, v_row.member_id, v_place, v_badge, v_points, p_actor_id)
    on conflict (challenge_id, member_id) do nothing
    returning id into v_award_id;

    if v_award_id is not null then
      if v_points > 0 then
        insert into public.lounge_points_ledger (user_id, delta, reason, ref_type, ref_id, actor_id)
        values (v_row.member_id, v_points, 'Lounge Challenge "' || v_ch.title || '" — place ' || v_place, 'challenge_award', v_award_id::text, p_actor_id)
        on conflict (ref_type, ref_id) do nothing;
      end if;

      insert into public.lounge_notifications (user_id, type, title, body, url, dedupe_key)
      values (
        v_row.member_id,
        'challenge_award',
        case v_place when 1 then '🥇 You won "' || v_ch.title || '"!' when 2 then '🥈 Runner-up in "' || v_ch.title || '"' else '🥉 Third place in "' || v_ch.title || '"' end,
        case when v_points > 0 then '+' || v_points || ' points and a permanent badge on your profile.' else 'A permanent badge is now on your profile.' end,
        '/lounge/challenges/' || p_challenge_id,
        'challenge_award:' || v_award_id::text
      )
      on conflict (dedupe_key) do nothing;

      perform public.lounge_evaluate_achievements(v_row.member_id);
      v_winners := v_winners || jsonb_build_object('member_id', v_row.member_id, 'entry_id', v_row.id, 'place', v_place, 'votes', v_row.vote_count);
    end if;
  end loop;

  update public.lounge_challenges
  set status = 'finalized',
      finalized_at = coalesce(finalized_at, now()),
      finalized_by = coalesce(finalized_by, p_actor_id)
  where id = p_challenge_id;

  return json_build_object('ok', true, 'challenge_id', p_challenge_id, 'newly_awarded', v_winners);
end;
$$;

revoke all on function public.lounge_finalize_challenge(uuid, uuid) from public, anon;
grant execute on function public.lounge_finalize_challenge(uuid, uuid) to authenticated;

-- ---------- RLS ----------
alter table public.lounge_challenges enable row level security;
alter table public.lounge_challenge_entries enable row level security;
alter table public.lounge_challenge_votes enable row level security;
alter table public.lounge_challenge_awards enable row level security;

drop policy if exists "Members can view published challenges" on public.lounge_challenges;
create policy "Members can view published challenges" on public.lounge_challenges
  for select to authenticated using (public.is_admin() or (public.is_lounge_member() and status <> 'draft'));

revoke insert, update, delete on public.lounge_challenges from anon, authenticated;

drop policy if exists "Members can view entries" on public.lounge_challenge_entries;
create policy "Members can view entries" on public.lounge_challenge_entries
  for select to authenticated
  using (public.is_admin() or member_id = auth.uid() or (public.is_lounge_member() and status = 'approved'));

drop policy if exists "Members can enter challenges" on public.lounge_challenge_entries;
create policy "Members can enter challenges" on public.lounge_challenge_entries
  for insert to authenticated
  with check (member_id = auth.uid() and public.is_lounge_member());

drop policy if exists "Members can edit own entries" on public.lounge_challenge_entries;
create policy "Members can edit own entries" on public.lounge_challenge_entries
  for update to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

revoke update, delete on public.lounge_challenge_entries from anon, authenticated;
grant update (title, description, project_url, image_url, gallery_urls, tools, category, updated_at)
  on public.lounge_challenge_entries to authenticated;

-- Voter identities are private: a member sees only their own vote.
drop policy if exists "Members can view own vote" on public.lounge_challenge_votes;
create policy "Members can view own vote" on public.lounge_challenge_votes
  for select to authenticated using (voter_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.lounge_challenge_votes from anon, authenticated;

drop policy if exists "Members can view awards" on public.lounge_challenge_awards;
create policy "Members can view awards" on public.lounge_challenge_awards
  for select to authenticated using (public.is_lounge_member() or public.is_admin());

revoke insert, update, delete on public.lounge_challenge_awards from anon, authenticated;
