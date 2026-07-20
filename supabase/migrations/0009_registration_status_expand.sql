-- Reemora — expand registration status vocabulary so admin can flip
-- a registration through its real lifecycle (accepted, refunded, no-show,
-- waitlist) without contorting the existing three-state enum. Seat
-- management stays coupled to the payment flow — changing the label here
-- does not adjust seats_available or refund the customer.

alter table public.registrations drop constraint if exists registrations_status_check;

alter table public.registrations add constraint registrations_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'refunded', 'no_show', 'waitlist'));
