-- Reemora training platform schema
-- Run via the Supabase MCP apply_migration tool or `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------- courses ----------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  duration_weeks integer not null check (duration_weeks > 0),
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'KWD',
  image_url text,
  short_description text not null,
  description text not null,
  curriculum text[] not null default '{}',
  instructor text not null default 'Reemora Certified Trainer',
  start_date date,
  end_date date,
  session_days text,
  session_time text,
  seats_total integer not null default 20 check (seats_total > 0),
  seats_available integer not null default 20 check (seats_available >= 0),
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_status_idx on public.courses (status);
create index if not exists courses_start_date_idx on public.courses (start_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

alter table public.courses enable row level security;

create policy "Public can view courses"
  on public.courses for select
  using (true);

create policy "Authenticated users can insert courses"
  on public.courses for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update courses"
  on public.courses for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete courses"
  on public.courses for delete
  to authenticated
  using (true);

-- ---------- registrations ----------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  seats integer not null default 1 check (seats > 0),
  notes text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'KWD',
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'cancelled')),
  myfatoorah_invoice_id text,
  created_at timestamptz not null default now()
);

create index if not exists registrations_course_id_idx on public.registrations (course_id);
create index if not exists registrations_payment_status_idx on public.registrations (payment_status);

alter table public.registrations enable row level security;

-- Registrations are created/updated by the server (service role key) from
-- API routes only — there is intentionally no public insert/select policy.
create policy "Authenticated users can view registrations"
  on public.registrations for select
  to authenticated
  using (true);

-- ---------- storage: course images ----------
insert into storage.buckets (id, name, public)
values ('course-images', 'course-images', true)
on conflict (id) do nothing;

create policy "Public can view course images"
  on storage.objects for select
  using (bucket_id = 'course-images');

create policy "Authenticated users can upload course images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'course-images');

create policy "Authenticated users can update course images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'course-images');

create policy "Authenticated users can delete course images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'course-images');
