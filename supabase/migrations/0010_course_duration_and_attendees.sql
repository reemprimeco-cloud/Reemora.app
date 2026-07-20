-- Reemora — richer duration + per-seat attendee capture + 5% multi-seat discount.
-- Courses gain days + hours (weeks stays around for legacy reads and can be
-- retired once every course row is migrated). Registrations gain a jsonb
-- attendees list (name/email/phone per seat) plus a discount_amount so the
-- admin can see how much was knocked off vs. the sticker total.

alter table public.courses
  add column if not exists duration_days integer not null default 0,
  add column if not exists duration_hours integer not null default 0;

alter table public.registrations
  add column if not exists attendees jsonb not null default '[]'::jsonb,
  add column if not exists discount_amount numeric(10, 2) not null default 0;

-- Seed reasonable defaults on any existing rows so course cards don't show
-- "0 days · 0 hours" during the rollout window. Assumes 5 hours per week,
-- rounded to whole days (5h * n weeks -> ceil(n * 5 / 24) days + remainder
-- hours). Admin can adjust from the course editor.
update public.courses
  set duration_days  = greatest(1, (duration_weeks * 5) / 24),
      duration_hours = (duration_weeks * 5) % 24
  where duration_days = 0 and duration_hours = 0;
