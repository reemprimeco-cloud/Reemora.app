-- Reemora Lounge — admin invitations.
--
-- Admins can invite people who already registered for a course (or anyone
-- by email) straight into the Lounge. Invited members are pre-approved:
-- the invitation itself is the admin's decision, so there is no pending
-- queue for them. We only record who invited whom and when.

alter table public.lounge_members
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references public.users (id) on delete set null;

alter table public.lounge_membership_events drop constraint if exists lounge_membership_events_action_check;
alter table public.lounge_membership_events
  add constraint lounge_membership_events_action_check
  check (action in ('applied', 'invited', 'approved', 'rejected', 'suspended', 'reactivated', 'note'));
