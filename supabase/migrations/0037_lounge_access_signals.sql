-- 0037: which approved Lounge members have really got into their account.
--
-- A sign-in timestamp alone can't tell: WhatsApp link previews and mail
-- scanners open one-time links on arrival, which signs the account in for
-- an instant without the person ever seeing the Lounge. A member counts as
-- having access when any of these is true:
--   * they signed in with a password at least once,
--   * a session of theirs was used again after it was created (token
--     refreshed more than a minute later), or
--   * they posted, commented or chatted in the Lounge.
-- Used by the admin "email set-password link" action to skip people who
-- are already in. Read-only, service role only. Reversible: drop function.

create or replace function public.lounge_access_signals()
returns table (user_id uuid, has_access boolean, recovery_sent_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.user_id,
    (
      exists (
        select 1 from auth.sessions s
        join auth.mfa_amr_claims c on c.session_id = s.id
        where s.user_id = m.user_id and c.authentication_method = 'password'
      )
      or exists (
        select 1 from auth.sessions s
        where s.user_id = m.user_id
          and greatest(coalesce(s.refreshed_at, s.created_at), coalesce(s.updated_at, s.created_at)) > s.created_at + interval '60 seconds'
      )
      or exists (select 1 from public.lounge_posts p where p.author_id = m.user_id)
      or exists (select 1 from public.lounge_comments c where c.author_id = m.user_id)
      or exists (select 1 from public.lounge_chat_messages x where x.author_id = m.user_id)
    ) as has_access,
    a.recovery_sent_at
  from public.lounge_members m
  join auth.users a on a.id = m.user_id
  where m.status = 'approved';
$$;

revoke all on function public.lounge_access_signals() from public, anon, authenticated;
grant execute on function public.lounge_access_signals() to service_role;
