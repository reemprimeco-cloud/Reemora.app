-- ==========================================================================
-- Reemora training platform — complete database schema
-- Paste this entire file into the Supabase SQL Editor and run it once.
-- ==========================================================================

-- ============================== 1. EXTENSIONS & HELPERS ==============================

-- Reemora training platform — extensions & shared helper functions
-- Applied first; later migrations depend on these.

create extension if not exists "pgcrypto";

-- Generic updated_at maintenance, reused by every table with an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Note: is_admin() is defined in 0003_rls.sql, not here — it's a `language
-- sql` function, and SQL-language functions are validated against the
-- catalog at CREATE time, so it must come after public.users exists.

-- ============================== 2. TABLES, INDEXES, FUNCTIONS, TRIGGERS ==============================

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

-- ============================== 3. ROW LEVEL SECURITY & STORAGE ==============================

-- Reemora training platform — Row Level Security policies

-- Used inside RLS policies to gate admin-only writes. security definer + a
-- pinned search_path let it read public.users regardless of the caller's
-- own RLS visibility, without being hijackable via a hostile search_path.
-- Defined here (not in 0001) because `language sql` functions are validated
-- against the catalog at CREATE time, and public.users must already exist.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

alter table public.users enable row level security;
alter table public.instructors enable row level security;
alter table public.certificates enable row level security;
alter table public.course_categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_schedule enable row level security;
alter table public.registrations enable row level security;
alter table public.payments enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.testimonials enable row level security;
alter table public.website_settings enable row level security;
alter table public.portfolio enable row level security;
alter table public.contact_messages enable row level security;

-- ---------- users ----------
create policy "Users can view own profile" on public.users
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy "Users can update own profile" on public.users
  for update to authenticated using (id = auth.uid() or public.is_admin());

-- Row creation happens via the on_auth_user_created trigger (security definer),
-- so no public insert policy is needed.

-- ---------- instructors ----------
create policy "Public can view instructors" on public.instructors
  for select using (true);

create policy "Admins can manage instructors" on public.instructors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- certificates ----------
create policy "Public can view certificates" on public.certificates
  for select using (true);

create policy "Admins can manage certificates" on public.certificates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- course_categories ----------
create policy "Public can view course categories" on public.course_categories
  for select using (true);

create policy "Admins can manage course categories" on public.course_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- courses ----------
create policy "Public can view published courses" on public.courses
  for select using (is_published = true);

create policy "Admins can view all courses" on public.courses
  for select to authenticated using (public.is_admin());

create policy "Admins can manage courses" on public.courses
  for insert to authenticated with check (public.is_admin());

create policy "Admins can update courses" on public.courses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete courses" on public.courses
  for delete to authenticated using (public.is_admin());

-- ---------- course_schedule ----------
create policy "Public can view course schedule" on public.course_schedule
  for select using (true);

create policy "Admins can manage course schedule" on public.course_schedule
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- registrations ----------
-- No public select/insert policy: registrations are written exclusively by
-- API routes using the service-role key (which bypasses RLS), so the
-- payment amount can never be tampered with from the browser.
create policy "Users can view own registrations" on public.registrations
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "Admins can update registrations" on public.registrations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- payments ----------
-- Financial records: no public access at all, service role writes only.
create policy "Admins can view payments" on public.payments
  for select to authenticated using (public.is_admin());

-- ---------- payment_transactions ----------
create policy "Admins can view payment transactions" on public.payment_transactions
  for select to authenticated using (public.is_admin());

-- ---------- testimonials ----------
create policy "Public can view published testimonials" on public.testimonials
  for select using (is_published = true);

create policy "Admins can view all testimonials" on public.testimonials
  for select to authenticated using (public.is_admin());

create policy "Admins can manage testimonials" on public.testimonials
  for insert to authenticated with check (public.is_admin());

create policy "Admins can update testimonials" on public.testimonials
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete testimonials" on public.testimonials
  for delete to authenticated using (public.is_admin());

-- ---------- website_settings ----------
create policy "Public can view website settings" on public.website_settings
  for select using (true);

create policy "Admins can manage website settings" on public.website_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- portfolio ----------
create policy "Public can view published portfolio items" on public.portfolio
  for select using (is_published = true);

create policy "Admins can view all portfolio items" on public.portfolio
  for select to authenticated using (public.is_admin());

create policy "Admins can manage portfolio" on public.portfolio
  for insert to authenticated with check (public.is_admin());

create policy "Admins can update portfolio" on public.portfolio
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete portfolio" on public.portfolio
  for delete to authenticated using (public.is_admin());

-- ---------- contact_messages ----------
-- Anyone can submit the public contact form; only admins can read the inbox.
create policy "Anyone can submit a contact message" on public.contact_messages
  for insert with check (true);

create policy "Admins can view contact messages" on public.contact_messages
  for select to authenticated using (public.is_admin());

create policy "Admins can update contact messages" on public.contact_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- storage ----------
insert into storage.buckets (id, name, public)
values
  ('course-images', 'course-images', true),
  ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

create policy "Public can view course images" on storage.objects
  for select using (bucket_id = 'course-images');

create policy "Admins can manage course images" on storage.objects
  for all to authenticated
  using (bucket_id = 'course-images' and public.is_admin())
  with check (bucket_id = 'course-images' and public.is_admin());

create policy "Public can view site assets" on storage.objects
  for select using (bucket_id = 'site-assets');

create policy "Admins can manage site assets" on storage.objects
  for all to authenticated
  using (bucket_id = 'site-assets' and public.is_admin())
  with check (bucket_id = 'site-assets' and public.is_admin());

-- ============================== 4. SEED DATA ==============================

-- Reemora training platform — starter content
-- Safe to re-run: every insert is keyed on a unique natural key with
-- `on conflict do nothing`.

-- ---------- course_categories ----------
insert into public.course_categories (name, slug, description, display_order) values
  ('AI Development', 'ai-development', 'Building full AI-powered applications end to end.', 1),
  ('AI Skills', 'ai-skills', 'Focused skills like prompt engineering and evaluation.', 2),
  ('No-Code', 'no-code', 'Building AI apps without writing code.', 3)
on conflict (slug) do nothing;

-- ---------- instructors ----------
insert into public.instructors (id, full_name, title, bio, years_experience, is_lead, display_order)
values (
  '00000000-0000-0000-0000-000000000001',
  'Reemora Certified Trainer',
  'Founder & Lead Trainer',
  'An internationally certified trainer and AI product builder dedicated to helping founders, developers and teams turn ideas into working AI applications. Combines hands-on software development experience with a certified training methodology to make complex AI concepts practical and immediately usable.',
  10,
  true,
  1
)
on conflict (id) do nothing;

-- ---------- certificates ----------
insert into public.certificates (instructor_id, title, issuing_body, display_order) values
  ('00000000-0000-0000-0000-000000000001', 'International Certified Trainer (ICT)', null, 1),
  ('00000000-0000-0000-0000-000000000001', 'AI Product & Curriculum Design', null, 2),
  ('00000000-0000-0000-0000-000000000001', 'Professional Training & Facilitation', null, 3)
on conflict do nothing;

-- ---------- courses + course_schedule ----------
with cat as (select id, slug from public.course_categories),
     ins as (select '00000000-0000-0000-0000-000000000001'::uuid as id),
     inserted_courses as (
       insert into public.courses (
         slug, title, category_id, instructor_id, level, duration_weeks, price, currency,
         short_description, description, curriculum
       )
       select v.slug, v.title, cat.id, ins.id, v.level, v.duration_weeks, v.price, v.currency,
              v.short_description, v.description, v.curriculum
       from (values
         (
           'ai-app-bootcamp', 'AI App Development Bootcamp', 'ai-development', 'Intermediate', 6, 450.00, 'KWD',
           'Design, build and ship a full AI-powered application from scratch using modern no-code and low-code AI tools.',
           'A hands-on bootcamp where you will design, build and deploy a complete AI-powered application. You will learn to integrate large language models, connect APIs, design clean user interfaces, and launch a working product by the end of the course.',
           array['Foundations of AI-assisted app building', 'Prompt engineering for product features', 'Connecting AI models to real applications via APIs', 'UI/UX design for AI products', 'Deploying and launching your app']
         ),
         (
           'prompt-engineering', 'Prompt Engineering for Developers', 'ai-skills', 'Beginner', 3, 180.00, 'KWD',
           'Master the art and science of writing prompts that get reliable, production-ready results from AI models.',
           'Learn structured prompting techniques, few-shot examples, chain-of-thought design, and evaluation methods to reliably get high quality output from AI models in real products.',
           array['How large language models interpret prompts', 'Structured prompting patterns', 'Few-shot and chain-of-thought techniques', 'Testing and evaluating prompt quality', 'Building reusable prompt libraries']
         ),
         (
           'ai-agents', 'Building AI Agents & Automations', 'ai-development', 'Advanced', 5, 380.00, 'KWD',
           'Build autonomous AI agents that plan, use tools, and automate multi-step business workflows.',
           'Go beyond chat interfaces and learn to design AI agents that can reason, call tools, and automate real workflows end-to-end. Covers agent architecture, tool-calling, memory, and safe deployment practices.',
           array['Agent architecture and reasoning loops', 'Tool-calling and function integration', 'Memory and context management', 'Multi-agent workflows', 'Safety, guardrails and deployment']
         ),
         (
           'nocode-ai-apps', 'No-Code AI Apps for Entrepreneurs', 'no-code', 'Beginner', 4, 220.00, 'KWD',
           'Turn your idea into a working AI-powered app without writing a single line of code.',
           'Perfect for founders and business owners. Learn to combine no-code platforms with AI building blocks to launch functional products quickly, without a technical background.',
           array['Choosing the right no-code stack', 'Wiring AI features into no-code apps', 'Databases, logic and automations', 'Launch checklist and monetization']
         )
       ) as v(slug, title, category_slug, level, duration_weeks, price, currency, short_description, description, curriculum)
       join cat on cat.slug = v.category_slug
       cross join ins
       on conflict (slug) do nothing
       returning id, slug
     )
insert into public.course_schedule (course_id, start_date, end_date, session_days, session_time, seats_total, seats_available, status)
select c.id, s.start_date, s.end_date, s.session_days, s.session_time, s.seats_total, s.seats_available, 'upcoming'
from inserted_courses c
join (values
  ('ai-app-bootcamp', date '2026-08-10', date '2026-09-21', 'Sun, Tue', '6:00 PM - 9:00 PM', 20, 12),
  ('prompt-engineering', date '2026-08-03', date '2026-08-24', 'Mon, Wed', '5:00 PM - 7:00 PM', 25, 25),
  ('ai-agents', date '2026-09-01', date '2026-10-06', 'Sat', '10:00 AM - 2:00 PM', 16, 9),
  ('nocode-ai-apps', date '2026-07-20', date '2026-08-10', 'Tue, Thu', '6:30 PM - 8:30 PM', 22, 4)
) as s(slug, start_date, end_date, session_days, session_time, seats_total, seats_available)
  on s.slug = c.slug;

-- ---------- testimonials ----------
insert into public.testimonials (student_name, role_company, quote, rating, display_order) values
  ('Sara A.', 'Founder, Early-Stage Startup', 'I went from zero technical background to launching my own AI-powered app in six weeks. The hands-on approach made all the difference.', 5, 1),
  ('Faisal M.', 'Software Engineer', 'The prompt engineering course completely changed how our development team ships AI features. Practical, structured, and immediately useful.', 5, 2),
  ('Lulwa K.', 'Product Manager', 'Best training investment I''ve made. The trainer''s real-world experience shows in every session.', 5, 3)
on conflict do nothing;

-- ---------- website_settings ----------
insert into public.website_settings (key, value) values
  ('site_name', '"Reemora"'),
  ('tagline', '"Build Apps with AI"'),
  ('contact_email', '"hello@reemora.app"'),
  ('contact_phone', '"+965 0000 0000"'),
  ('address', '"Kuwait"'),
  ('social_links', '{"linkedin": "", "instagram": "", "twitter": ""}'),
  ('cv_url', '"/cv/reemora-cv.pdf"')
on conflict (key) do nothing;

-- ---------- promote an admin (manual step) ----------
-- 1. Create the admin user in Supabase Dashboard -> Authentication -> Add user
--    (or have them sign up through the app).
-- 2. Then run, substituting the real email:
--
--   update public.users set role = 'admin' where email = 'admin@reemora.app';
