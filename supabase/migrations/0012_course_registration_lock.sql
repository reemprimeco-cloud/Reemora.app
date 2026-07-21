-- Reemora — per-course registration lock. Admin can publish a course (so
-- it's visible/browsable) while keeping payment/registration closed until
-- they're ready to open enrollment. Defaults to open so existing courses
-- aren't accidentally locked out on migration.

alter table public.courses
  add column if not exists registration_open boolean not null default true;
