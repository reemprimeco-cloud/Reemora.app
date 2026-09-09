-- Reemora — course feedback via one shared QR code (not one per course):
-- an attendee scans it, picks their course on the form, rates it, and
-- leaves a quote. Reuses the existing testimonials table and its
-- is_published approval flow rather than a new table, so admin review
-- is just an extra filter on the page that already manages testimonials
-- — nothing goes public until the admin flips it published.

alter table public.testimonials
  add column if not exists course_id uuid references public.courses (id) on delete set null;

create index if not exists testimonials_course_id_idx on public.testimonials (course_id);

-- Public can submit feedback, but only ever unpublished — it must sit in
-- the admin queue until approved. The public-view policy already added
-- in 0003_rls.sql ("Public can view published testimonials") only
-- selects is_published = true rows, so a course page can safely display
-- these once approved.
drop policy if exists "Anyone can submit course feedback" on public.testimonials;
create policy "Anyone can submit course feedback" on public.testimonials
  for insert with check (is_published = false);
