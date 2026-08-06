-- Reemora — "Request a private session" on the course detail page, for
-- visitors who want a custom date/time instead of joining a fixed cohort
-- (e.g. a private 1:1 or in-house group booking). No payment collected;
-- staff follow up to agree on scheduling and price.

create table if not exists public.private_session_requests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  preferred_date date,
  preferred_time text,
  group_size integer,
  certificate_needed boolean not null default false,
  notes text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists private_session_requests_course_id_idx on public.private_session_requests (course_id);
create index if not exists private_session_requests_is_read_idx on public.private_session_requests (is_read);
create index if not exists private_session_requests_created_at_idx on public.private_session_requests (created_at desc);

alter table public.private_session_requests enable row level security;

drop policy if exists "Anyone can submit a private session request" on public.private_session_requests;
drop policy if exists "Admins can view private session requests" on public.private_session_requests;
drop policy if exists "Admins can update private session requests" on public.private_session_requests;
drop policy if exists "Admins can delete private session requests" on public.private_session_requests;

create policy "Anyone can submit a private session request" on public.private_session_requests
  for insert with check (true);

create policy "Admins can view private session requests" on public.private_session_requests
  for select to authenticated using (public.is_admin());

create policy "Admins can update private session requests" on public.private_session_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete private session requests" on public.private_session_requests
  for delete to authenticated using (public.is_admin());
