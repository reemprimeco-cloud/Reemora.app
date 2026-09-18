-- Reemora — per-course opt-in for the two-installment payment plan.
-- Off by default: the admin turns it on per course from the course
-- editor. When off, the registration form only offers pay-in-full and
-- the payment API rejects an "installments" plan for that course.

alter table public.courses
  add column if not exists installments_enabled boolean not null default false;
