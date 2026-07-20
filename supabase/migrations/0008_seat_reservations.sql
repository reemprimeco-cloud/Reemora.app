-- Reemora — "Reserve Your Seat" pre-registration form on the public site.
-- A visitor tells us who they are, which course they're interested in
-- (optional — they may not know yet), what they already know about web /
-- app building, and how to reach them. No payment collected. Admin follows
-- up manually; once they're ready they can go through the paid MyFatoorah
-- flow via the main Register CTA.

create table if not exists public.seat_reservations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  interest text,
  skills text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists seat_reservations_course_id_idx on public.seat_reservations (course_id);
create index if not exists seat_reservations_is_read_idx on public.seat_reservations (is_read);
create index if not exists seat_reservations_created_at_idx on public.seat_reservations (created_at desc);

alter table public.seat_reservations enable row level security;

-- Anyone can submit a reservation from the public form.
create policy "Anyone can submit a seat reservation" on public.seat_reservations
  for insert with check (true);

-- Only admins can read / mark-as-read.
create policy "Admins can view seat reservations" on public.seat_reservations
  for select to authenticated using (public.is_admin());

create policy "Admins can update seat reservations" on public.seat_reservations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins can delete seat reservations" on public.seat_reservations
  for delete to authenticated using (public.is_admin());
