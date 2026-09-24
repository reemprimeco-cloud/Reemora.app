-- Reemora — remove columns and a function left over from an earlier,
-- abandoned implementation attempt of the UPayments/split-payment
-- feature. They were applied to this same database by mistake before
-- work moved to the branch that actually ships (this one), which has
-- its own equivalent columns (due_date, checkout_url, reminder_ready_at,
-- gateway_invoice_id, gateway_track_id) already in place and in active
-- use. Nothing in the app reads or writes any of the columns/function
-- dropped here.
--
-- myfatoorah_payment_id is separately dead: migration 0018's guarded
-- rename (myfatoorah_payment_id -> gateway_track_id) silently no-op'd
-- because gateway_track_id already existed (created fresh by the same
-- abandoned attempt) by the time 0018 ran, leaving this column orphaned
-- with gateway_track_id doing its job instead.

drop index if exists public.payments_gateway_order_id_idx;
drop index if exists public.payments_installment_due_idx;

alter table public.payments
  drop column if exists installment_no,
  drop column if exists installments_total,
  drop column if exists gateway_order_id,
  drop column if exists gateway_payment_id,
  drop column if exists gateway_link,
  drop column if exists reminder_count,
  drop column if exists last_reminder_at,
  drop column if exists myfatoorah_payment_id;

alter table public.registrations
  drop column if exists amount_paid;

drop function if exists public.add_registration_paid_amount(uuid, numeric);
