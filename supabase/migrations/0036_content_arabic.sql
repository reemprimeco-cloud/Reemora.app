-- 0036: Arabic versions of admin-managed public content.
--
-- Every public page is bilingual, but the trainer profile, certificates,
-- courses, categories, testimonials, portfolio and tagline were stored in
-- one language only, so the Arabic site showed English text. Each table
-- gains optional *_ar columns; the public loaders substitute them when the
-- visitor's language is Arabic and the field is filled, and fall back to
-- the original otherwise. Additive and reversible: nothing existing
-- changes shape, and dropping the new columns restores the old state.

alter table public.instructors
  add column if not exists full_name_ar text,
  add column if not exists title_ar text,
  add column if not exists bio_ar text,
  add column if not exists timeline_ar jsonb not null default '[]'::jsonb,
  add column if not exists skills_ar text[] not null default '{}';

alter table public.certificates
  add column if not exists title_ar text,
  add column if not exists issuing_body_ar text;

alter table public.courses
  add column if not exists title_ar text,
  add column if not exists short_description_ar text,
  add column if not exists description_ar text,
  add column if not exists curriculum_ar text[] not null default '{}';

alter table public.course_categories
  add column if not exists name_ar text;

alter table public.testimonials
  add column if not exists student_name_ar text,
  add column if not exists role_company_ar text,
  add column if not exists quote_ar text;

alter table public.portfolio
  add column if not exists title_ar text,
  add column if not exists description_ar text,
  add column if not exists category_ar text;

-- website_settings is a key/value table: the Arabic tagline and address
-- live under their own keys (tagline_ar, address_ar), no schema change.
