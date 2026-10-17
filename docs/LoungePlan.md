# Reemora Lounge — Implementation Plan

Phase 1 output: what exists today, what the Lounge adds, and how it is wired in. Kept short on purpose; the migrations and code are the detailed spec.

## 1. Audit findings (verified from source, not docs)

| Area | Finding |
|---|---|
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict, Tailwind v4 (`@theme inline` tokens in `globals.css`), `next-themes`, `lucide-react`, `zod` 4, `web-push` already installed. No test runner. |
| Auth | Supabase Auth email + password only. `middleware.ts` refreshes the session cookie on every request and gates `/admin/**`. `public.users` is auto-created by the `on_auth_user_created` trigger with `role = 'student'`; `role` is checked to `('admin','student')`. Exactly one user exists (the admin). |
| Authorization | Single helper `public.is_admin()` used by every RLS policy. There is no narrower admin role model to reuse. |
| Data access | Public pages read through `src/lib/data/*` with the cookie-free client. Admin pages are server shells passing initial data to `"use client"` managers that write to Supabase directly under RLS. Trusted writes (payments, contact) use the service-role client inside `/api/**` route handlers. |
| Live database | Supabase project `Reemora-Buildapps` (`syrjxgskzvximkwosdna`). 18 tables live. Migrations `0024_course_archive` and `0025_relax_duration_weeks` from this branch are **not applied live yet** (the `course_archive` table does not exist). Realtime publication `supabase_realtime` exists with no tables in it. Buckets: `course-images`, `site-assets`. |
| Push / PWA | `push_subscriptions` table (admin-only RLS), `src/lib/webpush.ts` (`sendWebPushToAdmins` sends to **every** row), `/api/push/subscribe|unsubscribe`, `public/sw.js` (push only, no caching), `src/app/manifest.webmanifest/route.ts` (name "Reemora app", SVG + 180px icons). |
| i18n | Cookie-based `en`/`ar` with `DIR` → `<html dir>`; dictionaries in `src/lib/i18n/dictionaries.ts`; Tajawal font for Arabic. Admin panel is English only. |
| Design system | Tokens: `navy-900/800/700`, `blue-600/500/400/100/050`, `surface`, `surface-alt`, `border-c`, `ink-soft`. Rounded-full pills for buttons, `rounded-2xl`/`[22px]` cards, `border-border-c`. Shared primitives: `Button`/`LinkButton`, `useToast`, `useConfirm`, `useCloseOnEscape`, `compressImage`. |
| Deployment | Vercel, `vercel.json` cron for payment reminders, CSP in `next.config.ts` (`connect-src 'self' https://*.supabase.co` — Realtime uses `wss://*.supabase.co`, which must be added). |

## 2. Design decisions

- **One account system.** Lounge members are ordinary Supabase Auth users. `public.users.role` is untouched; Lounge access is a separate `lounge_members` row keyed by `users.id` with `status in ('pending','approved','rejected','suspended')`. Admin approval is independent of course registrations and payments.
- **Membership helper.** `public.is_lounge_member()` (approved status) is the gate in every community RLS policy, the same way `is_admin()` gates admin writes. Admins are not automatically members; they manage the Lounge from `/admin/lounge/**` using the service-role client behind an explicit `is_admin` check and an audit log.
- **Writes go through `/api/lounge/**` route handlers** using the cookie-authenticated client (so RLS still applies), then the service-role client only for side effects a member must not be able to forge (notifications, points, achievements, audit). Reads happen in Server Components under RLS. Chat uses Supabase Realtime (`postgres_changes` on `lounge_chat_messages`, RLS-enforced) for live updates.
- **Integrity in the database, not the UI.** Duplicate likes/follows/bookmarks/votes are blocked by primary keys. Points are an append-only ledger with a unique `(ref_type, ref_id)` idempotency key; `lounge_members.points_total` is maintained by a trigger and column-level grants stop members from editing it (or their own `status`). Votes and challenge finalization are `security definer` functions that re-check eligibility and are safe to re-run.
- **No private messaging.** Only `lounge_chat_messages` (one room) exists. No conversation or DM tables or routes.
- **Protected columns via grants.** `revoke update on lounge_members from authenticated; grant update (profile columns only)`. Same pattern for the ledger (no update/delete at all).
- **PWA**: extend the existing `sw.js` and manifest instead of adding a second worker. The worker only caches a static `/offline` page and never caches authenticated responses.

## 3. Routes

| Route | Purpose |
|---|---|
| `/lounge` | Landing for visitors; feed for approved members; status screen for pending/rejected/suspended |
| `/lounge/join`, `/lounge/login`, `/auth/callback` | Membership application (name, email, phone, password), sign in, email-confirmation callback |
| `/lounge/new`, `/lounge/posts/[id]` | Create post / post detail with comments |
| `/lounge/chat` | Public real-time room |
| `/lounge/members`, `/lounge/members/[id]`, `/lounge/me` | Directory, public profile, edit own profile |
| `/lounge/notifications`, `/lounge/bookmarks`, `/lounge/settings` | Notification center, saved posts, push + install |
| `/lounge/challenges`, `/lounge/challenges/[id]` | Lounge Challenges list, entry + voting + results |
| `/admin/lounge/**` | Members, moderation & reports, achievements & points, challenges, audit log, analytics |

## 4. Migrations (all additive, numbered after `0025`)

| File | Adds |
|---|---|
| `0026_lounge_membership.sql` | `lounge_members`, `lounge_membership_events`, `lounge_follows`, `lounge_notifications`, `lounge_audit_log`, `is_lounge_member()`, `lounge_member_contact()`, `lounge-media` bucket + policies, member push-subscription policy |
| `0027_lounge_community.sql` | `lounge_posts`, `lounge_comments`, `lounge_post_likes`, `lounge_bookmarks`, `lounge_chat_messages` (+ Realtime publication), `lounge_reports`, counter + rate-limit + mute triggers |
| `0028_lounge_achievements.sql` | `lounge_achievements`, `lounge_member_achievements`, `lounge_points_rules`, append-only `lounge_points_ledger`, `lounge_award_points()`, `lounge_evaluate_achievements()`, seeded definitions and rules |
| `0030_lounge_hardening.sql` | revokes execute on `lounge_*` functions from `anon`/`authenticated` except the three member-facing ones |
| `0031_lounge_invites.sql` | `lounge_members.invited_at/invited_by`, `invited` membership action |
| `0032_lounge_verified.sql` | `lounge_members.is_verified`, `lounge_members.badge_label` (admin-only via service role; not in the member update grant) |
| `0033_lounge_comment_categories_chat_files.sql` | `lounge_comments.category`, chat `attachment_*` columns, body-or-attachment check, `lounge-files` bucket (10 MB) + policies, `lounge-media` limit 5 MB |
| `0034_lounge_private_media.sql` | `lounge-media` and `lounge-files` buckets set private; public read policies replaced by owner / approved member / admin select; files served via `/api/lounge/media/[...path]` |
| `0035_lounge_upload_quota.sql` | `lounge_upload_quota_ok()` + upload policies capped at 80 objects per member per 24 h |
| `0036_content_arabic.sql` | `*_ar` twins on instructors, certificates, courses, course_categories, testimonials, portfolio (public content localization; website_settings uses `tagline_ar` / `address_ar` keys) |
| `0029_lounge_challenges.sql` | `lounge_challenges`, `lounge_challenge_entries`, `lounge_challenge_votes`, `lounge_challenge_awards`, `lounge_cast_vote()`, `lounge_finalize_challenge()` |

Status: all four are **applied to the live project** (recorded in `supabase_migrations.schema_migrations` as versions `20261016120026`–`20261016120029`). They were run as plain SQL in chunks because the Supabase MCP tool stalls on scripts containing `drop`/`revoke` statements; the files in the repo are the source of truth and are idempotent (`if not exists`, `drop ... if exists`).

Rollback: every object is new, so dropping the `lounge_*` tables (cascade), the `lounge_*` functions, `is_lounge_member()`, the `lounge-media` bucket policies and the member push-subscription policy reverts the feature without touching existing tables.

## 5. Deployment prerequisites (outside the repo)

1. Supabase → Authentication: enable email sign-ups, keep "Confirm email" on, add `https://reemora.app/auth/callback` to Redirect URLs, set Site URL. Configure custom SMTP (e.g. Resend) — the built-in sender is rate-limited to a few emails per hour.
2. Vercel env: existing vars plus `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (already read by `webpush.ts`).
3. Migrations `0024_course_archive` and `0025_relax_duration_weeks` are now applied live. Lounge migrations 0026–0036 are applied (0024/0025 from earlier work are applied too).

## 6. Verification performed (2026-10-16)

- `npx tsc --noEmit`, `npm run lint`, `npm run build` — all pass (every Lounge route compiles; existing routes unchanged).
- Database security suite run against the live project inside a single transaction that was rolled back at the end (`raise exception` with the collected results), using `set local role authenticated` + `request.jwt.claims` to impersonate three fixture accounts (two approved, one pending). Assertions that passed:
  - Pending member sees only their own membership row, cannot post, reads no chat.
  - Approved member can post; cannot post as another author; duplicate like / follow counted once; cannot follow a pending member.
  - Member cannot change `status` or `points_total` (column grant), can edit `bio`; cannot insert ledger rows, cannot self-award achievements, cannot call `lounge_evaluate_achievements()`.
  - Chat rate limit rejects the 6th message inside 10 s; members cannot edit chat messages; another member's email stays hidden unless opted in.
  - Members cannot edit or delete another member's post; see no one else's notifications.
  - Project post pays 10 rule points via trigger; evaluating achievements twice awards First Share + Project Creator once each; `points_total` equals the ledger sum.
  - One entry per member per challenge; cannot vote for own entry; repeated vote for the same entry counts once; votes cannot be inserted directly; voter sees only their own vote; pending member cannot vote; vote rejected after the deadline; member cannot finalize.
  - Finalizing twice yields exactly two awards and two award ledger rows (tie broken by earliest entry), the winner is notified once, the challenge ends `finalized`, and the champion's `points_total` equals their ledger sum.
- Supabase security advisor re-run after `0030_lounge_hardening`: no `anon` role can execute any `lounge_*` function; only `is_lounge_member`, `lounge_member_contact` and `lounge_cast_vote` are callable by signed-in users. Remaining advisor warnings concern pre-existing functions (`is_admin`, `decrement_seats`, `adjust_seats_available`, `handle_new_user`, `set_updated_at`) and the Auth "leaked password protection" toggle, both outside this change.

Not verified in this session (needs a browser against the deployed site): the Supabase Auth email round-trip (sign-up confirmation, password reset), Realtime delivery in the chat UI, Web Push on a real device, and the install prompt. The code paths are the same ones the admin push toggle already uses in production.
