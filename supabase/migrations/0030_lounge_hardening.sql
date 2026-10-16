-- Reemora Lounge — hardening after the Supabase security advisor run.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, which
-- makes every SECURITY DEFINER function reachable through
-- /rest/v1/rpc/<name> by the anon and authenticated roles. Trigger and
-- internal helper functions have no business being callable that way, so
-- this strips the default grant. The member-facing entry points keep an
-- explicit grant to `authenticated` only.

-- Trigger functions and internal helpers: nobody calls these directly.
revoke all on function public.lounge_follows_counters() from public, anon, authenticated;
revoke all on function public.lounge_post_like_counter() from public, anon, authenticated;
revoke all on function public.lounge_post_comment_counter() from public, anon, authenticated;
revoke all on function public.lounge_rate_limit() from public, anon, authenticated;
revoke all on function public.lounge_chat_mute_check() from public, anon, authenticated;
revoke all on function public.lounge_points_ledger_apply() from public, anon, authenticated;
revoke all on function public.lounge_points_ledger_immutable() from public, anon, authenticated;
revoke all on function public.lounge_points_on_post() from public, anon, authenticated;
revoke all on function public.lounge_points_on_helpful() from public, anon, authenticated;
revoke all on function public.lounge_entry_guard() from public, anon, authenticated;
revoke all on function public.lounge_vote_counter() from public, anon, authenticated;
revoke all on function public.lounge_award_points(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.lounge_evaluate_achievements(uuid) from public, anon, authenticated;

-- Member entry points: signed-in users only (RLS / in-function checks do
-- the rest). anon never needs them.
revoke all on function public.is_lounge_member() from public, anon;
grant execute on function public.is_lounge_member() to authenticated;
revoke all on function public.lounge_member_contact(uuid) from public, anon;
grant execute on function public.lounge_member_contact(uuid) to authenticated;
revoke all on function public.lounge_cast_vote(uuid) from public, anon;
grant execute on function public.lounge_cast_vote(uuid) to authenticated;
-- Finalization is called with the service role from the admin API; the
-- function itself also re-checks is_admin() for a direct call.
revoke all on function public.lounge_finalize_challenge(uuid, uuid) from public, anon, authenticated;

-- Advisor: pin search_path on the one plpgsql helper that was created
-- without it.
alter function public.lounge_points_ledger_immutable() set search_path = public;
