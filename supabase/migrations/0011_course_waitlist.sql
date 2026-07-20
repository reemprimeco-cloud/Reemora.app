-- Reemora — sold-out cohort waitlist. When a schedule has 0 seats left,
-- the course detail page swaps "Register Now" for "Join Waitlist", a
-- minimal name + mobile capture (no email, no payment) so staff can call
-- or WhatsApp the person when a seat frees up.

create table if not exists public.course_waitlist (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  course_schedule_id uuid references public.course_schedule (id) on delete set null,
  full_name text not null,
  phone text not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists course_waitlist_course_id_idx on public.course_waitlist (course_id);
create index if not exists course_waitlist_schedule_id_idx on public.course_waitlist (course_schedule_id);
create index if not exists course_waitlist_notified_idx on public.course_waitlist (notified);
create index if not exists course_waitlist_created_at_idx on public.course_waitlist (created_at desc);

alter table public.course_waitlist enable row level security;

drop policy if exists "Anyone can join a course waitlist" on public.course_waitlist;
drop policy if exists "Admins can view waitlist" on public.course_waitlist;
drop policy if exists "Admins can update waitlist" on public.course_waitlist;
drop policy if exists "Admins can delete waitlist" on public.course_waitlist;

create policy "Anyone can join a course waitlist" on public.course_waitlist
  for insert with check (true);

create policy "Admins can view waitlist" on public.course_waitlist
  for select to authenticated using (public.is_admin());

create policy "Admins can update waitlist" on public.course_waitlist
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete waitlist" on public.course_waitlist
  for delete to authenticated using (public.is_admin());
