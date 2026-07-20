-- Reemora — make the About Your Trainer timeline entries and skill chips
-- editable by the admin, instead of being hardcoded in page.tsx.
-- Additive: existing rows get empty defaults and behave the same until edited.

alter table public.instructors
  add column if not exists timeline jsonb not null default '[]'::jsonb,
  add column if not exists skills text[] not null default '{}'::text[];
