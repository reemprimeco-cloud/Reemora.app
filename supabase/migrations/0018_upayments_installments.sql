-- Reemora — switch the card gateway from MyFatoorah to UPayments and add
-- a two-installment payment plan (50% at registration, 50% due 30 days
-- after the first payment, with automatic SMS/WhatsApp reminders).
--
-- Additive: existing rows keep working. Legacy myfatoorah_* columns stay
-- for historical audit rows; new gateway identifiers live in generic
-- gateway_* columns so a future gateway swap is a settings change, not a
-- schema change.

-- ---------- registrations ----------
alter table public.registrations
  add column if not exists payment_plan text not null default 'full'
    check (payment_plan in ('full', 'installments')),
  add column if not exists amount_paid numeric(10, 2) not null default 0 check (amount_paid >= 0);

-- ---------- payments ----------
alter table public.payments
  -- 1 for the only/first payment, 2 for the second installment.
  add column if not exists installment_no integer not null default 1 check (installment_no in (1, 2)),
  add column if not exists installments_total integer not null default 1 check (installments_total in (1, 2)),
  -- When the installment must be paid. Null for pay-now payments.
  add column if not exists due_date date,
  -- Our own unguessable order id sent to the gateway as order.id, echoed
  -- back as requested_order_id so callbacks can be matched safely.
  add column if not exists gateway_order_id text,
  add column if not exists gateway_track_id text,
  add column if not exists gateway_payment_id text,
  -- Last hosted-checkout link we generated (regenerated on demand).
  add column if not exists gateway_link text,
  add column if not exists reminder_count integer not null default 0,
  add column if not exists last_reminder_at timestamptz;

create unique index if not exists payments_gateway_order_id_idx on public.payments (gateway_order_id)
  where gateway_order_id is not null;
create index if not exists payments_installment_due_idx on public.payments (due_date)
  where status = 'pending' and installment_no = 2;

-- ---------- payment_transactions ----------
-- New event kind for outbound reminders so the audit trail shows every
-- SMS/WhatsApp nudge next to the gateway events.
alter table public.payment_transactions drop constraint if exists payment_transactions_event_type_check;
alter table public.payment_transactions add constraint payment_transactions_event_type_check
  check (event_type in ('created', 'callback', 'webhook', 'status_check', 'error', 'reminder'));

-- ---------- settings ----------
-- The site-wide payment mode value "myfatoorah" becomes "upayments".
update public.website_settings
  set value = to_jsonb('upayments'::text)
  where key = 'payment_mode' and value = to_jsonb('myfatoorah'::text);

-- ---------- helpers ----------
-- Atomically add a paid installment to the registration's running total.
create or replace function public.add_registration_paid_amount(p_registration_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.registrations
  set amount_paid = least(amount, amount_paid + p_amount)
  where id = p_registration_id;
end;
$$;
