-- Reemora — archive of course runs that have already been delivered.
--
-- A course is reused rather than duplicated: the same course row gets new
-- dates for its next run. That overwrites the cohort's dates and mixes the
-- new registrations in with the old ones, so the record of what was
-- actually delivered — when, over which days, to how many people — is lost
-- the moment the course is reused.
--
-- This table keeps a snapshot taken before the reuse. Everything is copied
-- as values rather than referenced, so an archived run stays readable even
-- after the course is renamed, rescheduled or deleted. course_id and
-- course_schedule_id are kept only as a convenience link back to the live
-- rows when they still exist.

create table if not exists public.course_archive (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  course_schedule_id uuid references public.course_schedule (id) on delete set null,

  -- Snapshot of the course/cohort as it ran.
  course_title text not null,
  start_date date,
  end_date date,
  session_days text,
  session_time text,
  location text,
  seats_total integer,

  -- Who attended. participants holds the full list at archive time so the
  -- names survive even when the live registrations are later reused,
  -- reassigned or deleted; the counts are stored alongside it so the table
  -- can be listed without unpacking the jsonb.
  participants_count integer not null default 0,
  seats_taken integer not null default 0,
  confirmed_count integer not null default 0,
  total_paid numeric(10, 2) not null default 0,
  currency text not null default 'KWD',
  participants jsonb not null default '[]'::jsonb,

  notes text,
  archived_at timestamptz not null default now()
);

create index if not exists course_archive_course_id_idx on public.course_archive (course_id);
create index if not exists course_archive_start_date_idx on public.course_archive (start_date desc);

alter table public.course_archive enable row level security;

-- Admin-only in every direction: this is internal history, never public.
drop policy if exists "Admins can view course archive" on public.course_archive;
create policy "Admins can view course archive" on public.course_archive
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can insert course archive" on public.course_archive;
create policy "Admins can insert course archive" on public.course_archive
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update course archive" on public.course_archive;
create policy "Admins can update course archive" on public.course_archive
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete course archive" on public.course_archive;
create policy "Admins can delete course archive" on public.course_archive
  for delete to authenticated using (public.is_admin());
