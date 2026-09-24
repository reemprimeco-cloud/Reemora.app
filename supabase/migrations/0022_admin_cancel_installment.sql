-- Reemora — let an admin write off the deferred second half of a split
-- payment (e.g. a student withdraws after paying the first 50%) instead
-- of it sitting "pending" forever and getting chased by the reminder
-- cron. payments.status already allows 'cancelled' from the original
-- schema; this just widens the audit-trail event type so the action
-- shows up in payment_transactions alongside gateway events.

alter table public.payment_transactions drop constraint if exists payment_transactions_event_type_check;
alter table public.payment_transactions add constraint payment_transactions_event_type_check
  check (event_type in ('created', 'callback', 'webhook', 'status_check', 'error', 'admin_action'));
