-- Reemora — per-course opt-in for the 2-installment (split 50/50)
-- payment plan. Off by default: the admin turns it on per course from
-- the course editor. When off, the registration form only offers pay in
-- full and the checkout API rejects a "split_50_50" request for that
-- course.

alter table public.courses
  add column if not exists installments_enabled boolean not null default false;
