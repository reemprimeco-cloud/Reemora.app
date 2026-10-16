-- Reemora Lounge — achievements, points ledger, trophies.
--
-- Integrity model:
--   • lounge_points_ledger is append-only; (ref_type, ref_id) is unique so
--     the same event can never be paid twice. A trigger keeps
--     lounge_members.points_total in sync; members have no write path to
--     either (column grants in 0026 + no policies here).
--   • Eligibility is computed in lounge_evaluate_achievements() from real
--     data (posts, comments, awards) — never from client input.
--   • Activity points go through lounge_award_points(), which applies the
--     admin-configurable rule and its daily cap.

-- ---------- lounge_achievements (definitions, admin-editable) ----------
create table if not exists public.lounge_achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null,
  name_ar text,
  description text not null,
  description_ar text,
  icon text not null default 'trophy',
  tier text not null default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  points integer not null default 0 check (points >= 0),
  criteria_type text not null check (criteria_type in (
    'profile_complete', 'posts_count', 'projects_count', 'helpful_count',
    'project_interactions', 'discussion_started', 'challenge_wins', 'project_months'
  )),
  criteria_threshold integer not null default 1 check (criteria_threshold >= 1),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists lounge_achievements_set_updated_at on public.lounge_achievements;
create trigger lounge_achievements_set_updated_at
  before update on public.lounge_achievements
  for each row execute function public.set_updated_at();

-- ---------- lounge_member_achievements (awards) ----------
create table if not exists public.lounge_member_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.lounge_members (user_id) on delete cascade,
  achievement_id uuid not null references public.lounge_achievements (id) on delete cascade,
  awarded_at timestamptz not null default now(),
  source text,
  awarded_by uuid references public.users (id) on delete set null,
  unique (user_id, achievement_id)
);

create index if not exists lounge_member_achievements_user_idx on public.lounge_member_achievements (user_id, awarded_at desc);

-- ---------- lounge_points_rules (admin-configurable activity points) ----------
create table if not exists public.lounge_points_rules (
  key text primary key,
  label text not null,
  points integer not null default 0 check (points >= 0),
  daily_cap integer check (daily_cap is null or daily_cap >= 1),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

drop trigger if exists lounge_points_rules_set_updated_at on public.lounge_points_rules;
create trigger lounge_points_rules_set_updated_at
  before update on public.lounge_points_rules
  for each row execute function public.set_updated_at();

-- ---------- lounge_points_ledger (append-only) ----------
create table if not exists public.lounge_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.lounge_members (user_id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null,
  ref_type text not null,
  ref_id text not null,
  actor_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (ref_type, ref_id)
);

create index if not exists lounge_points_ledger_user_idx on public.lounge_points_ledger (user_id, created_at desc);

create or replace function public.lounge_points_ledger_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lounge_members set points_total = points_total + new.delta where user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists lounge_points_ledger_apply on public.lounge_points_ledger;
create trigger lounge_points_ledger_apply
  after insert on public.lounge_points_ledger
  for each row execute function public.lounge_points_ledger_apply();

-- Ledger rows are never edited or removed; corrections are new rows.
create or replace function public.lounge_points_ledger_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'lounge_points_ledger is append-only';
end;
$$;

drop trigger if exists lounge_points_ledger_immutable on public.lounge_points_ledger;
create trigger lounge_points_ledger_immutable
  before update or delete on public.lounge_points_ledger
  for each row execute function public.lounge_points_ledger_immutable();

-- ---------- lounge_award_points(): rule-based, capped, idempotent ----------
create or replace function public.lounge_award_points(
  p_user_id uuid,
  p_rule_key text,
  p_ref_type text,
  p_ref_id text,
  p_reason text,
  p_actor_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.lounge_points_rules%rowtype;
  v_today integer;
  v_inserted integer;
begin
  select * into v_rule from public.lounge_points_rules where key = p_rule_key and is_active;
  if not found or v_rule.points <= 0 then
    return false;
  end if;
  if not exists (select 1 from public.lounge_members where user_id = p_user_id and status = 'approved') then
    return false;
  end if;
  if v_rule.daily_cap is not null then
    select count(*) into v_today
    from public.lounge_points_ledger
    where user_id = p_user_id
      and ref_type = p_ref_type
      and reason = p_reason
      and created_at > now() - interval '1 day';
    if v_today >= v_rule.daily_cap then
      return false;
    end if;
  end if;
  insert into public.lounge_points_ledger (user_id, delta, reason, ref_type, ref_id, actor_id)
  values (p_user_id, v_rule.points, p_reason, p_ref_type, p_ref_id, p_actor_id)
  on conflict (ref_type, ref_id) do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

revoke all on function public.lounge_award_points(uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- Activity hooks: a new project post and a helpful answer earn rule points
-- automatically, with the rule's daily cap protecting against farming.
create or replace function public.lounge_points_on_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'project' then
    perform public.lounge_award_points(new.author_id, 'new_project', 'post', new.id::text, 'Published a project');
  end if;
  return new;
end;
$$;

drop trigger if exists lounge_points_on_post on public.lounge_posts;
create trigger lounge_points_on_post
  after insert on public.lounge_posts
  for each row execute function public.lounge_points_on_post();

create or replace function public.lounge_points_on_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_helpful and not old.is_helpful then
    perform public.lounge_award_points(new.author_id, 'helpful_answer', 'comment', new.id::text, 'Answer marked helpful');
  end if;
  return new;
end;
$$;

drop trigger if exists lounge_points_on_helpful on public.lounge_comments;
create trigger lounge_points_on_helpful
  after update of is_helpful on public.lounge_comments
  for each row execute function public.lounge_points_on_helpful();

-- ---------- lounge_evaluate_achievements(): server-side eligibility ----------
create or replace function public.lounge_evaluate_achievements(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.lounge_members%rowtype;
  v_ach record;
  v_metric integer;
  v_award_id uuid;
  v_awarded text[] := '{}';
begin
  select * into v_member from public.lounge_members where user_id = p_user_id;
  if not found or v_member.status <> 'approved' then
    return v_awarded;
  end if;

  for v_ach in
    select a.* from public.lounge_achievements a
    where a.is_active
      and not exists (select 1 from public.lounge_member_achievements ma where ma.user_id = p_user_id and ma.achievement_id = a.id)
    order by a.sort_order, a.created_at
  loop
    v_metric := 0;

    if v_ach.criteria_type = 'profile_complete' then
      v_metric := case
        when v_member.avatar_url is not null
          and coalesce(char_length(v_member.bio), 0) >= 10
          and cardinality(v_member.skills) > 0
          and (v_member.website_url is not null or v_member.social_links <> '{}'::jsonb)
        then 1 else 0 end;

    elsif v_ach.criteria_type = 'posts_count' then
      select count(*) into v_metric from public.lounge_posts where author_id = p_user_id and not is_hidden;

    elsif v_ach.criteria_type = 'projects_count' then
      select count(*) into v_metric from public.lounge_posts where author_id = p_user_id and type = 'project' and not is_hidden;

    elsif v_ach.criteria_type = 'helpful_count' then
      select count(*) into v_metric from public.lounge_comments where author_id = p_user_id and is_helpful and not is_hidden;

    elsif v_ach.criteria_type = 'project_interactions' then
      select coalesce(sum(like_count + comment_count), 0) into v_metric
      from public.lounge_posts where author_id = p_user_id and type = 'project' and not is_hidden;

    elsif v_ach.criteria_type = 'discussion_started' then
      select coalesce(max(comment_count), 0) into v_metric
      from public.lounge_posts where author_id = p_user_id and type in ('discussion', 'question') and not is_hidden;

    elsif v_ach.criteria_type = 'challenge_wins' then
      select count(*) into v_metric from public.lounge_challenge_awards where member_id = p_user_id and place = 1;

    elsif v_ach.criteria_type = 'project_months' then
      select count(distinct date_trunc('month', created_at)) into v_metric
      from public.lounge_posts where author_id = p_user_id and type = 'project' and not is_hidden;
    end if;

    if v_metric >= v_ach.criteria_threshold then
      insert into public.lounge_member_achievements (user_id, achievement_id, source)
      values (p_user_id, v_ach.id, v_ach.criteria_type || ':' || v_metric)
      on conflict (user_id, achievement_id) do nothing
      returning id into v_award_id;

      if v_award_id is not null then
        if v_ach.points > 0 then
          insert into public.lounge_points_ledger (user_id, delta, reason, ref_type, ref_id)
          values (p_user_id, v_ach.points, 'Achievement: ' || v_ach.name, 'achievement', v_award_id::text)
          on conflict (ref_type, ref_id) do nothing;
        end if;
        v_awarded := array_append(v_awarded, v_ach.code);
      end if;
    end if;
  end loop;

  return v_awarded;
end;
$$;

revoke all on function public.lounge_evaluate_achievements(uuid) from public, anon, authenticated;

-- ---------- RLS ----------
alter table public.lounge_achievements enable row level security;
alter table public.lounge_member_achievements enable row level security;
alter table public.lounge_points_rules enable row level security;
alter table public.lounge_points_ledger enable row level security;

drop policy if exists "Members can view achievements" on public.lounge_achievements;
create policy "Members can view achievements" on public.lounge_achievements
  for select to authenticated using (public.is_admin() or (is_active and public.is_lounge_member()));

drop policy if exists "Members can view earned achievements" on public.lounge_member_achievements;
create policy "Members can view earned achievements" on public.lounge_member_achievements
  for select to authenticated using (user_id = auth.uid() or public.is_lounge_member() or public.is_admin());

drop policy if exists "Members can view points rules" on public.lounge_points_rules;
create policy "Members can view points rules" on public.lounge_points_rules
  for select to authenticated using (public.is_lounge_member() or public.is_admin());

drop policy if exists "Members can view points ledger" on public.lounge_points_ledger;
create policy "Members can view points ledger" on public.lounge_points_ledger
  for select to authenticated using (user_id = auth.uid() or public.is_lounge_member() or public.is_admin());

-- All writes happen through the functions above or the service role from
-- admin routes (which audit every manual adjustment).
revoke insert, update, delete on public.lounge_achievements from anon, authenticated;
revoke insert, update, delete on public.lounge_member_achievements from anon, authenticated;
revoke insert, update, delete on public.lounge_points_rules from anon, authenticated;
revoke insert, update, delete on public.lounge_points_ledger from anon, authenticated;

-- ---------- seed: configurable defaults ----------
insert into public.lounge_points_rules (key, label, points, daily_cap) values
  ('new_project',       'Publishing a new project',            10, 2),
  ('helpful_answer',    'Having an answer marked helpful',     15, 5),
  ('challenge_place_1', 'Winning a Lounge Challenge (1st)',   100, null),
  ('challenge_place_2', 'Lounge Challenge runner-up (2nd)',    60, null),
  ('challenge_place_3', 'Lounge Challenge third place',        40, null),
  ('challenge_winner',  'Lounge Challenge honourable mention', 30, null)
on conflict (key) do nothing;

insert into public.lounge_achievements (code, name, name_ar, description, description_ar, icon, tier, points, criteria_type, criteria_threshold, sort_order) values
  ('first_steps',           'First Steps',           'الخطوات الأولى',   'Complete your profile with a picture, bio, skills and a link.', 'أكمل ملفك بصورة ونبذة ومهارات ورابط.', 'sparkles', 'bronze', 20, 'profile_complete', 1, 10),
  ('first_share',           'First Share',           'أول مشاركة',       'Publish your first post in the Lounge.', 'انشر أول منشور لك في المجتمع.', 'message', 'bronze', 10, 'posts_count', 1, 20),
  ('project_creator',       'Project Creator',       'صانع المشاريع',    'Publish your first project.', 'انشر مشروعك الأول.', 'rocket', 'bronze', 30, 'projects_count', 1, 30),
  ('helpful_member',        'Helpful Member',        'عضو مفيد',         'Have one of your answers marked as helpful.', 'يتم تحديد إحدى إجاباتك كمفيدة.', 'handshake', 'silver', 25, 'helpful_count', 1, 40),
  ('community_contributor', 'Community Contributor', 'مساهم في المجتمع', 'Have five answers marked as helpful.', 'يتم تحديد خمس إجابات لك كمفيدة.', 'award', 'gold', 100, 'helpful_count', 5, 50),
  ('conversation_starter',  'Conversation Starter',  'مُطلق النقاش',     'Start a discussion that gets ten comments.', 'ابدأ نقاشاً يحصل على عشرة تعليقات.', 'message', 'silver', 40, 'discussion_started', 10, 60),
  ('rising_creator',        'Rising Creator',        'صانع صاعد',        'Collect 25 likes and comments across your projects.', 'اجمع 25 إعجاباً وتعليقاً على مشاريعك.', 'trending', 'silver', 50, 'project_interactions', 25, 70),
  ('challenge_winner',      'Challenge Winner',      'فائز بالتحدي',     'Win a Lounge Challenge.', 'افز بأحد تحديات المجتمع.', 'crown', 'gold', 150, 'challenge_wins', 1, 80),
  ('multiple_wins',         'Multiple Wins',         'انتصارات متعددة',  'Win more than one Lounge Challenge.', 'افز بأكثر من تحدٍ واحد.', 'medal', 'platinum', 300, 'challenge_wins', 2, 90),
  ('consistent_creator',    'Consistent Creator',    'صانع مثابر',       'Publish projects in three different months.', 'انشر مشاريع في ثلاثة أشهر مختلفة.', 'calendar', 'gold', 120, 'project_months', 3, 100)
on conflict (code) do nothing;
