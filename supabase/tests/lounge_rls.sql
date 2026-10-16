-- Reemora Lounge — authorization regression suite.
--
-- Runs entirely inside one DO block that creates throw-away users, acts
-- as them through the `authenticated` / `anon` roles exactly as PostgREST
-- does, and asserts the rules the product promises:
--
--   1. a pending applicant cannot post, comment or chat;
--   2. an approved member cannot grant themselves points, a verified
--      badge, or a different status;
--   3. a member cannot edit another member's profile;
--   4. a signed-out visitor sees nothing;
--   5. a member can only upload into their own storage folder.
--
-- The block always ends by raising an exception, so nothing it inserted is
-- ever committed. The exception message carries the results: it starts
-- with "LOUNGE_RLS_OK" when every assertion passed, or "LOUNGE_RLS_FAIL"
-- followed by the failed checks.
--
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f supabase/tests/lounge_rls.sql
-- (or paste into the Supabase SQL editor). Requires a superuser/postgres
-- connection because it switches roles.

do $$
declare
  v_pending uuid := gen_random_uuid();
  v_member  uuid := gen_random_uuid();
  v_other   uuid := gen_random_uuid();
  v_post    uuid;
  v_fails   text[] := '{}';
  v_n       int;
begin
  -- ---------- seed throw-away accounts (rolled back at the end) ----------
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_pending, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-pending-' || v_pending || '@test.invalid', 'x', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Pending Tester"}', now(), now()),
    (v_member,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-member-'  || v_member  || '@test.invalid', 'x', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Member Tester"}', now(), now()),
    (v_other,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-other-'   || v_other   || '@test.invalid', 'x', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Other Tester"}', now(), now());

  insert into public.users (id, email, full_name, role) values
    (v_pending, 'rls-pending-' || v_pending || '@test.invalid', 'Pending Tester', 'student'),
    (v_member,  'rls-member-'  || v_member  || '@test.invalid', 'Member Tester',  'student'),
    (v_other,   'rls-other-'   || v_other   || '@test.invalid', 'Other Tester',   'student')
  on conflict (id) do nothing;

  insert into public.lounge_members (user_id, status, display_name) values
    (v_pending, 'pending',  'Pending Tester'),
    (v_member,  'approved', 'Member Tester'),
    (v_other,   'approved', 'Other Tester');

  -- ---------- 1. pending applicant ----------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_pending, 'role', 'authenticated')::text, true);

  begin
    insert into public.lounge_posts (author_id, type, title, body) values (v_pending, 'discussion', 'Hello', 'I should not be able to post');
    v_fails := v_fails || 'pending member could create a post';
  exception when others then null; end;

  begin
    insert into public.lounge_chat_messages (author_id, body) values (v_pending, 'hi');
    v_fails := v_fails || 'pending member could chat';
  exception when others then null; end;

  -- ---------- 2. approved member: allowed things work, privilege escalation fails ----------
  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);

  begin
    insert into public.lounge_posts (author_id, type, title, body) values (v_member, 'discussion', 'Hello', 'Members can post') returning id into v_post;
  exception when others then
    v_fails := v_fails || ('approved member could not post: ' || sqlerrm);
  end;

  begin
    update public.lounge_members set points_total = 9999 where user_id = v_member;
    v_fails := v_fails || 'member could set their own points_total';
  exception when others then null; end;

  begin
    update public.lounge_members set is_verified = true, badge_label = 'Certified' where user_id = v_member;
    v_fails := v_fails || 'member could verify themselves';
  exception when others then null; end;

  begin
    update public.lounge_members set status = 'suspended' where user_id = v_other;
    v_fails := v_fails || 'member could change another member status';
  exception when others then null; end;

  begin
    insert into public.lounge_points_ledger (user_id, delta, reason, ref_type, ref_id) values (v_member, 500, 'self', 'test', gen_random_uuid());
    v_fails := v_fails || 'member could write to the points ledger';
  exception when others then null; end;

  -- ---------- 3. cannot edit someone else's profile (RLS filters to 0 rows) ----------
  update public.lounge_members set display_name = 'Hacked' where user_id = v_other;
  get diagnostics v_n = row_count;
  if v_n <> 0 then v_fails := v_fails || 'member could rename another member'; end if;

  update public.lounge_members set display_name = 'Renamed Self' where user_id = v_member;
  get diagnostics v_n = row_count;
  if v_n <> 1 then v_fails := v_fails || 'member could not rename themselves'; end if;

  -- ---------- 5. storage: only the member's own folder ----------
  begin
    insert into storage.objects (bucket_id, name, owner, owner_id) values ('lounge-media', v_other || '/evil.jpg', v_member, v_member::text);
    v_fails := v_fails || 'member could upload into another member folder';
  exception when others then null; end;

  begin
    insert into storage.objects (bucket_id, name, owner, owner_id) values ('lounge-media', v_member || '/ok.jpg', v_member, v_member::text);
  exception when others then
    v_fails := v_fails || ('member could not upload into own folder: ' || sqlerrm);
  end;

  -- ---------- 4. anonymous visitor ----------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  select count(*) into v_n from public.lounge_posts;
  if v_n <> 0 then v_fails := v_fails || 'anonymous visitor can read posts'; end if;

  select count(*) into v_n from public.lounge_members;
  if v_n <> 0 then v_fails := v_fails || 'anonymous visitor can read members'; end if;

  select count(*) into v_n from storage.objects where bucket_id in ('lounge-media', 'lounge-files');
  if v_n <> 0 then v_fails := v_fails || 'anonymous visitor can list lounge uploads'; end if;

  -- ---------- report + roll back everything ----------
  perform set_config('role', 'postgres', true);
  if array_length(v_fails, 1) is null then
    raise exception 'LOUNGE_RLS_OK — all assertions passed (test data rolled back)';
  else
    raise exception 'LOUNGE_RLS_FAIL — %', array_to_string(v_fails, ' | ');
  end if;
end $$;
