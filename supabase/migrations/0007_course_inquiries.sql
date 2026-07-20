-- Reemora — capture soft leads. Someone who wants to know more about a
-- course before committing to pay uses the inquiry form; once they're
-- ready, they can still register via the paid MyFatoorah flow.

create table if not exists public.course_inquiries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  course_schedule_id uuid references public.course_schedule (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists course_inquiries_course_id_idx on public.course_inquiries (course_id);
create index if not exists course_inquiries_is_read_idx on public.course_inquiries (is_read);
create index if not exists course_inquiries_created_at_idx on public.course_inquiries (created_at desc);

alter table public.course_inquiries enable row level security;

-- Anyone can submit an inquiry (like the public contact form).
create policy "Anyone can submit a course inquiry" on public.course_inquiries
  for insert with check (true);

-- Only admins can read / mark-as-read.
create policy "Admins can view inquiries" on public.course_inquiries
  for select to authenticated using (public.is_admin());

create policy "Admins can update inquiries" on public.course_inquiries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete inquiries" on public.course_inquiries
  for delete to authenticated using (public.is_admin());
