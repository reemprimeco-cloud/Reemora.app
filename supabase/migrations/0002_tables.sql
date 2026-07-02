-- Reemora training platform — core schema (13 tables)

-- ---------- users (extends auth.users) ----------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Auto-provision a public.users row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- instructors ----------
create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  full_name text not null,
  title text,
  bio text,
  photo_url text,
  years_experience integer,
  is_lead boolean not null default false,
  social_links jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger instructors_set_updated_at
  before update on public.instructors
  for each row execute function public.set_updated_at();

-- ---------- certificates ----------
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  title text not null,
  issuing_body text,
  image_url text,
  issue_date date,
  credential_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index certificates_instructor_id_idx on public.certificates (instructor_id);

-- ---------- course_categories ----------
create table public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- courses ----------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category_id uuid references public.course_categories (id) on delete set null,
  instructor_id uuid references public.instructors (id) on delete set null,
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  duration_weeks integer not null check (duration_weeks > 0),
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'KWD',
  image_url text,
  short_description text not null,
  description text not null,
  curriculum text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_category_id_idx on public.courses (category_id);
create index courses_instructor_id_idx on public.courses (instructor_id);
create index courses_is_published_idx on public.courses (is_published);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- ---------- course_schedule ----------
-- A course can run multiple times (cohorts); each cohort is its own schedule row.
create table public.course_schedule (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  start_date date,
  end_date date,
  session_days text,
  session_time text,
  seats_total integer not null default 20 check (seats_total > 0),
  seats_available integer not null default 20 check (seats_available >= 0),
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_schedule_seats_within_total check (seats_available <= seats_total)
);

create index course_schedule_course_id_idx on public.course_schedule (course_id);
create index course_schedule_status_idx on public.course_schedule (status);
create index course_schedule_start_date_idx on public.course_schedule (start_date);

create trigger course_schedule_set_updated_at
  before update on public.course_schedule
  for each row execute function public.set_updated_at();

-- Atomic seat decrement, called via RPC from the payment callback route
-- (server-side, service role) once a payment is confirmed.
create or replace function public.decrement_seats(p_schedule_id uuid, p_seats integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.course_schedule
  set seats_available = greatest(0, seats_available - p_seats)
  where id = p_schedule_id;
end;
$$;

-- ---------- registrations ----------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  course_schedule_id uuid not null references public.course_schedule (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  seats integer not null default 1 check (seats > 0),
  notes text,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'KWD',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index registrations_course_schedule_id_idx on public.registrations (course_schedule_id);
create index registrations_user_id_idx on public.registrations (user_id);
create index registrations_status_idx on public.registrations (status);

-- ---------- payments ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'KWD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  method text not null default 'myfatoorah',
  myfatoorah_invoice_id text,
  myfatoorah_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_registration_id_idx on public.payments (registration_id);
create index payments_status_idx on public.payments (status);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------- payment_transactions ----------
-- Audit log of every interaction with the MyFatoorah API for a payment.
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  event_type text not null check (event_type in ('created', 'callback', 'webhook', 'status_check', 'error')),
  status text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create index payment_transactions_payment_id_idx on public.payment_transactions (payment_id);

-- ---------- testimonials ----------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  role_company text,
  quote text not null,
  avatar_url text,
  rating integer check (rating between 1 and 5),
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index testimonials_is_published_idx on public.testimonials (is_published);

-- ---------- website_settings ----------
-- Simple key/value store for global site config (contact info, social links, CV url, etc).
create table public.website_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger website_settings_set_updated_at
  before update on public.website_settings
  for each row execute function public.set_updated_at();

-- ---------- portfolio ----------
create table public.portfolio (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  project_url text,
  category text,
  is_published boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_is_published_idx on public.portfolio (is_published);

-- ---------- contact_messages ----------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_is_read_idx on public.contact_messages (is_read);
