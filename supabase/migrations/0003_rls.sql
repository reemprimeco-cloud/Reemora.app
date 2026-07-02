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
