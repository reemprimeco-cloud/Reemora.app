-- Reemora — switch card-payment gateway from MyFatoorah to UPayments, and
-- add support for a 50/50 split-payment plan (first half now, second half
-- due 30 days later with a WhatsApp reminder).

alter table public.payments rename column myfatoorah_invoice_id to gateway_invoice_id;
alter table public.payments rename column myfatoorah_payment_id to gateway_track_id;

alter table public.payments alter column method set default 'upayment';

-- Split-payment support: due_date is set only on the second (deferred)
-- installment of a split plan — null means "pay now" (a full payment or
-- the first half of a split). checkout_url holds the UPayments invoice
-- link generated for that installment (needed for the deferred half,
-- since it's created later by a cron job rather than returned directly
-- to a live checkout redirect). reminder_ready_at marks when the cron
-- job has generated a fresh link and notified the admin, so it doesn't
-- re-notify every day once a reminder has gone out.
alter table public.payments
  add column if not exists due_date date,
  add column if not exists checkout_url text,
  add column if not exists reminder_ready_at timestamptz;

create index if not exists payments_due_date_idx on public.payments (due_date) where due_date is not null;

alter table public.registrations
  add column if not exists payment_plan text not null default 'full';

alter table public.registrations drop constraint if exists registrations_payment_plan_check;
alter table public.registrations add constraint registrations_payment_plan_check
  check (payment_plan in ('full', 'split_50_50'));
